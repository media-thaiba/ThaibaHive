import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { verifyPassword, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/auth/schemas";
import { logActivity } from "@/lib/api/activity-log";
import { checkRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";
import { serverLogger } from "@/lib/server-logger";
import { eq } from "drizzle-orm";
import { withPublicApm } from "@/lib/api/public-apm";

export const POST = withPublicApm(async function POST(request: Request) {
  try {
    const ip = extractIp(request);
    const rl = checkRateLimit(ip, "auth");
    if (!rl.allowed) return rateLimitResponse(rl.resetMs);

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { email, password, rememberMe } = parsed.data;

    const emailRl = checkRateLimit(`login-email:${email.toLowerCase()}`, "auth");
    if (!emailRl.allowed) return rateLimitResponse(emailRl.resetMs);

    const staffMember = await db
      .select()
      .from(staff)
      .where(eq(staff.email, email))
      .get();

    if (!staffMember || !staffMember.passwordHash) {
      serverLogger.warn("Login failed: user not found", { email });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, staffMember.passwordHash);

    if (!valid) {
      serverLogger.warn("Login failed: password mismatch", { email });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!staffMember.isActive) {
      serverLogger.warn("Login failed: user inactive", { email });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // 1. Device Fingerprint & Trust Scoring (IDP-005)
    const deviceFingerprint = (body as any).deviceFingerprint;
    let deviceTrustScore = 100;
    if (deviceFingerprint) {
      try {
        const { computeCompositeHash, fingerprintToTrustScore, computeDriftScore } = await import("@/lib/identity/device-fingerprint");
        const { cacheTrustScore } = await import("@/lib/identity/trust-scoring");
        const { device_fingerprints } = await import("@thaiba/db/schema");
        const compositeHash = computeCompositeHash(deviceFingerprint);

        const existingDevice = await db
          .select()
          .from(device_fingerprints)
          .where(eq(device_fingerprints.staff_id, staffMember.id))
          .get();

        if (existingDevice) {
          const baseline = JSON.parse(existingDevice.attributes || "{}");
          const drift = computeDriftScore(baseline, deviceFingerprint);
          deviceTrustScore = fingerprintToTrustScore(drift);
        } else {
          await db.insert(device_fingerprints).values({
            id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            staff_id: staffMember.id,
            institution_id: null,
            composite_hash: compositeHash,
            attributes: JSON.stringify(deviceFingerprint),
            trust_score: 100,
          });
        }
        cacheTrustScore(compositeHash, deviceTrustScore);
      } catch {
        // Fallback
      }
    }

    // 2. Continuous Risk Evaluation (IDP-006)
    const { evaluateRisk } = await import("@/lib/identity/risk-engine");
    const risk = await evaluateRisk({
      userId: staffMember.id,
      ip,
      deviceTrustScore,
    });

    // 3. Critical Risk Anomaly (IDP-006 AC4): Terminate sessions and block authentication completely
    if (risk.level === "critical") {
      const { revocationStore } = await import("@/lib/identity/revocation-store");
      const { publishRevocation } = await import("@/lib/identity/revocation-mesh");
      const { logIdentityEvent } = await import("@/lib/identity/identity-audit-events");

      revocationStore.revoke(staffMember.id, staffMember.id, "CRITICAL_SECURITY_RISK_BLOCKED");
      await publishRevocation(staffMember.id, staffMember.id, "CRITICAL_SECURITY_RISK_BLOCKED");

      await logIdentityEvent({
        eventType: "session.revoked",
        userId: staffMember.id,
        riskScore: risk.score,
        triggers: risk.triggers,
        reason: "Critical risk anomaly detected - authentication blocked",
      });

      return NextResponse.json({
        error: "Authentication blocked due to critical security anomaly. Please contact security administration.",
        riskLevel: "critical",
        triggers: risk.triggers,
      }, { status: 403 });
    }

    // 4. High Risk Anomaly (IDP-007): Challenge with Step-Up MFA
    if (risk.level === "high") {
      const { createChallenge } = await import("@/lib/identity/webauthn-service");
      const { logIdentityEvent } = await import("@/lib/identity/identity-audit-events");
      const { createStepUpToken } = await import("@thaiba/auth");
      const challenge = createChallenge(staffMember.id);
      const stepUpToken = await createStepUpToken(staffMember.id, challenge.challengeId);

      await logIdentityEvent({
        eventType: "risk.stepup.triggered",
        userId: staffMember.id,
        riskScore: risk.score,
        triggers: risk.triggers,
      });

      return NextResponse.json({
        stepUpRequired: true,
        challengeId: challenge.challengeId,
        challenge: challenge.challenge,
        riskLevel: risk.level,
        triggers: risk.triggers,
        staffId: staffMember.id,
        stepUpToken,
      }, { status: 200 });
    }

    const dpopHeader = request.headers.get("dpop");
    let dpopThumbprint: string | undefined;
    if (dpopHeader) {
      const { verifyDPoPProof } = await import("@/lib/identity/dpop-engine");
      const dpopVerify = await verifyDPoPProof(dpopHeader, request.method, request.url.split("?")[0]);
      if (dpopVerify.valid) {
        dpopThumbprint = dpopVerify.thumbprint;
      }
    }

    const sessionPayload = {
      staffId: staffMember.id,
      email: staffMember.email,
      role: staffMember.role,
      employeeId: staffMember.employeeId,
      name: `${staffMember.firstName} ${staffMember.lastName}`,
      tokenVersion: staffMember.tokenVersion ?? 0,
    };

    const token = dpopThumbprint
      ? await (await import("@/lib/auth")).createDPoPSession(sessionPayload, dpopThumbprint, rememberMe)
      : await createSession(sessionPayload, rememberMe);

    // Record session in identity_sessions table & log migration event (IDP-004)
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    try {
      const { identity_sessions } = await import("@thaiba/db/schema");
      const { logMigrationEvent } = await import("@/lib/identity/migration-layer");
      await db.insert(identity_sessions).values({
        id: sessionId,
        staff_id: staffMember.id,
        dpop_thumbprint: dpopThumbprint || null,
        dpop_migrated: !!dpopThumbprint,
        expires_at: new Date(Date.now() + (dpopThumbprint ? 10 * 60 * 1000 : 24 * 60 * 60 * 1000)).toISOString(),
      });
      await logMigrationEvent(
        staffMember.id,
        sessionId,
        dpopThumbprint ? "migration.token.dpop" : "migration.token.legacy",
      );
    } catch {
      // Ignore if table not yet migrated
    }

    await logActivity({
      request,
      staffId: staffMember.id,
      action: "LOGIN",
      resourceType: "auth",
    });

    return NextResponse.json({
      token,
      user: {
        id: staffMember.id,
        email: staffMember.email,
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        role: staffMember.role,
        employeeId: staffMember.employeeId,
      },
      staff: {
        id: staffMember.id,
        email: staffMember.email,
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        role: staffMember.role,
        employeeId: staffMember.employeeId,
      },
    });
} catch (error: unknown) {
    serverLogger.error("Login error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
