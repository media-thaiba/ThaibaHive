import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, staffInstitutions } from "@/db/schema";
import { createSession, createSessionWithRefresh, verifyGoogleToken } from "@/lib/auth";
import { eq, and, or, sql } from "drizzle-orm";
import { checkDistributedRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";
import crypto from "crypto";

const UNIFORM_AUTH_DENIED_ERROR = "Access denied: Account authorization failed";

function hashIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export async function POST(request: Request) {
  const ip = extractIp(request);
  const rateLimit = await checkDistributedRateLimit(`auth:google:${ip}`, "auth");
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetMs);
  }

  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: "Google ID token is required" }, { status: 400 });
    }

    const rawIds = [
      process.env.GOOGLE_CLIENT_IDS,
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_IDS,
      process.env.GOOGLE_CLIENT_ID,
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    ]
      .filter(Boolean)
      .join(",");
    const allowedClientIds = Array.from(
      new Set(rawIds.split(",").map(c => c.trim()).filter(Boolean))
    );

    if (allowedClientIds.length === 0) {
      console.error("Neither GOOGLE_CLIENT_IDS nor NEXT_PUBLIC_GOOGLE_CLIENT_IDS is configured — rejecting Google auth");
      return NextResponse.json({ error: "Google authentication is not configured" }, { status: 503 });
    }

    let payload;
    try {
      payload = await verifyGoogleToken(idToken, allowedClientIds);
    } catch (err: unknown) {
      console.error("Google token verification failed:", err);
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }

    const { email, sub, jti } = payload;

    // ── A1 FIX: TOKEN REPLAY PROTECTION VIA JTI SINGLE-USE CHECK ────────────
    if (jti) {
      const jtiCheck = await checkDistributedRateLimit(`auth:google:jti:${jti}`, {
        windowMs: 3600_000, // 1 hour token expiration window
        max: 1, // Single-use execution
        keyPrefix: "jti",
      });
      if (!jtiCheck.allowed) {
        console.warn(
          JSON.stringify({
            event: "google_token_replay_detected",
            reason: "jti_already_used",
            jtiHash: hashIdentifier(jti),
            timestamp: new Date().toISOString(),
          })
        );
        return NextResponse.json(
          { error: "Token replay detected. Please sign in again." },
          { status: 401 }
        );
      }
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── D2 FIX: DETERMINISTIC MULTI-ROW / COLLISION AMBIGUITY CHECK ──────────
    // Fetch all candidates matching either by normalized email or by googleSub.
    const candidates = await db
      .select()
      .from(staff)
      .where(
        or(
          sql`lower(${staff.email}) = ${normalizedEmail}`,
          eq(staff.googleSub, sub)
        )
      )
      .all();

    // ── STEP 1A: ZERO-JIT ENFORCEMENT ────────────────────────────────────────
    // If no candidate exists, fail closed with zero DB writes and uniform 403 (D3).
    if (candidates.length === 0) {
      console.warn(
        JSON.stringify({
          event: "unauthorized_google_auth_attempt",
          reason: "unauthorized_unknown_email",
          emailHash: hashIdentifier(normalizedEmail),
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json({ error: UNIFORM_AUTH_DENIED_ERROR, code: "ACCOUNT_NOT_FOUND" }, { status: 403 });
    }

    // If multiple distinct staff rows match (e.g. Row X matched by email and Row Y matched by sub,
    // or case-colliding duplicate email records exist), fail closed to prevent identity confusion (D2).
    const distinctIds = Array.from(new Set(candidates.map((c) => c.id)));
    if (distinctIds.length > 1) {
      console.error(
        JSON.stringify({
          event: "ambiguous_google_identity_collision",
          reason: "ambiguous_identity_collision",
          severity: "critical",
          matchedStaffIds: distinctIds,
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json({ error: UNIFORM_AUTH_DENIED_ERROR, code: "ACCOUNT_NOT_FOUND" }, { status: 403 });
    }

    const staffMember = candidates[0];

    // Uniform 403 on deactivated account (D3)
    if (!staffMember.isActive) {
      console.warn(
        JSON.stringify({
          event: "deactivated_account_login_blocked",
          reason: "account_deactivated",
          staffId: staffMember.id,
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json({ error: UNIFORM_AUTH_DENIED_ERROR, code: "ACCOUNT_NOT_FOUND" }, { status: 403 });
    }

    // ── D1 FIX: RACE-SAFE BIND-ON-FIRST-LOGIN WITH RECHECK ───────────────────
    // If staff row was pre-created and googleSub is null, atomically bind sub.
    if (!staffMember.googleSub) {
      const updateResult = await db
        .update(staff)
        .set({
          googleSub: sub,
          emailVerifiedAt: staffMember.emailVerifiedAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(staff.id, staffMember.id),
            sql`${staff.googleSub} IS NULL`
          )
        )
        .returning();

      if (updateResult.length === 0) {
        // Race condition: another concurrent request already updated this row.
        // Re-read fresh record from database to verify if the winning sub matches.
        const fresh = await db
          .select({ id: staff.id, googleSub: staff.googleSub, isActive: staff.isActive, emailVerifiedAt: staff.emailVerifiedAt })
          .from(staff)
          .where(eq(staff.id, staffMember.id))
          .get();

        if (!fresh || fresh.googleSub !== sub || !fresh.isActive) {
          console.error(
            JSON.stringify({
              event: "concurrent_first_login_race_lost_mismatch",
              reason: "race_sub_mismatch",
              severity: "critical",
              staffId: staffMember.id,
              expectedSubHash: hashIdentifier(fresh?.googleSub),
              presentedSubHash: hashIdentifier(sub),
              timestamp: new Date().toISOString(),
            })
          );
          return NextResponse.json({ error: UNIFORM_AUTH_DENIED_ERROR, code: "ACCOUNT_NOT_FOUND" }, { status: 403 });
        }
        staffMember.googleSub = fresh.googleSub;
        staffMember.emailVerifiedAt = fresh.emailVerifiedAt;
      } else {
        staffMember.googleSub = sub;
        staffMember.emailVerifiedAt = updateResult[0].emailVerifiedAt;
      }
    } else if (staffMember.googleSub !== sub) {
      // Sub mismatch: attempt to authenticate as a user with a different Google account (D1/D4)
      console.error(
        JSON.stringify({
          event: "google_sub_mismatch_detected",
          reason: "bound_sub_mismatch",
          severity: "critical",
          staffId: staffMember.id,
          expectedSubHash: hashIdentifier(staffMember.googleSub),
          presentedSubHash: hashIdentifier(sub),
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json({ error: UNIFORM_AUTH_DENIED_ERROR, code: "ACCOUNT_NOT_FOUND" }, { status: 403 });
    }

    // ── D5 FIX: CONDITIONAL EMAIL VERIFICATION WITHOUT REDUNDANT WRITES ───────
    if (!staffMember.emailVerifiedAt) {
      const verifiedNow = new Date().toISOString();
      await db
        .update(staff)
        .set({ emailVerifiedAt: verifiedNow })
        .where(eq(staff.id, staffMember.id));
      staffMember.emailVerifiedAt = verifiedNow;
    }

    const isFirstLogin = staffMember.isFirstLogin ?? false;
    const needsOnboarding = isFirstLogin;

    // Resolve tenant scope via staffInstitutions junction table (staff has no direct institutionId column)
    const staffInstRow = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, staffMember.id))
      .get();

    const resolvedInstitutionId = staffInstRow?.institutionId ?? null;

    // F-12: token-in-body only for mobile clients presenting the platform header.
    const isMobileClient = (request.headers.get("x-client-platform") ?? "").toLowerCase() === "mobile";
    let token: string;
    let refreshToken: string | undefined;

    const sessionPayload = {
      staffId: staffMember.id,
      email: staffMember.email,
      role: staffMember.role,
      employeeId: staffMember.employeeId,
      name: `${staffMember.firstName} ${staffMember.lastName}`,
      tokenVersion: staffMember.tokenVersion ?? 0,
      institutionId: resolvedInstitutionId,
    };

    if (isMobileClient) {
      const res = await createSessionWithRefresh(
        sessionPayload,
        true,
        "mobile",
        30 * 24 * 60 * 60
      );
      token = res.token;
      refreshToken = res.refreshToken;
    } else {
      token = await createSession(sessionPayload);
    }

    return NextResponse.json({
      ...(isMobileClient ? { token, ...(refreshToken ? { refreshToken } : {}) } : {}),
      needsOnboarding,
      isFirstLogin,
      user: {
        id: staffMember.id,
        email: staffMember.email,
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        role: staffMember.role,
        employeeId: staffMember.employeeId,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
