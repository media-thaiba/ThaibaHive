import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { verifySession, createActionStepUpToken } from "@thaiba/auth";
import { isAuthorizedDeveloper, hasPermission } from "@thaiba/auth/roles";
import { db, credentialChallenges, webauthnCredentials, staff } from "@/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

const StepUpVerifySchema = z.object({
  action: z.enum(["session:terminate"]),
  factor: z.enum(["passkey", "email_otp", "password"]),
  challenge: z.string().optional(),
  passkeyCredential: z
    .object({
      id: z.string(),
      rawId: z.string().optional(),
      response: z.object({
        clientDataJSON: z.string(),
        authenticatorData: z.string(),
        signature: z.string(),
        userHandle: z.string().optional().nullable(),
      }),
    })
    .optional(),
  otp: z.string().optional(),
  password: z.string().optional(),
});

function parseDER(signatureBuffer: Buffer): { r: Buffer; s: Buffer } {
  if (signatureBuffer[0] !== 0x30) throw new Error("Invalid ASN.1 sequence");
  let offset = 2;
  if (signatureBuffer[1] & 0x80) {
    const lenBytes = signatureBuffer[1] & 0x7f;
    offset = 2 + lenBytes;
  }
  if (signatureBuffer[offset] !== 0x02) throw new Error("Invalid integer tag for r");
  const rLen = signatureBuffer[offset + 1];
  const r = signatureBuffer.subarray(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  if (signatureBuffer[offset] !== 0x02) throw new Error("Invalid integer tag for s");
  const sLen = signatureBuffer[offset + 1];
  const s = signatureBuffer.subarray(offset + 2, offset + 2 + sLen);
  return { r, s };
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session || !session.staffId || !session.sid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parseRes = StepUpVerifySchema.safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parseRes.error.format() }, { status: 400 });
    }
    const { action, factor, challenge, passkeyCredential, otp, password } = parseRes.data;

    // Gate: Check caller permission
    const actionPermMap: Record<string, string> = {
      "session:terminate": "system:sessions:terminate",
    };
    const reqPerm = actionPermMap[action];
    if (reqPerm && !hasPermission(session.role, reqPerm)) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions for action" }, { status: 403 });
    }

    // ── DB-Backed 3-Strike Lockout Check ──────────────────────────────────────
    const nowIso = new Date().toISOString();
    await db.delete(credentialChallenges).where(
      and(
        eq(credentialChallenges.staffId, session.staffId),
        eq(credentialChallenges.type, "step_up_failure"),
        sql`${credentialChallenges.expiresAt} <= ${nowIso}`
      )
    ).run();

    const failureRows = await db
      .select()
      .from(credentialChallenges)
      .where(
        and(
          eq(credentialChallenges.staffId, session.staffId),
          eq(credentialChallenges.type, "step_up_failure"),
          gt(credentialChallenges.expiresAt, nowIso)
        )
      )
      .all();

    if (failureRows.length >= 3) {
      return NextResponse.json(
        { error: "Too many failed step-up attempts. Locked out for 15 minutes." },
        { status: 429 }
      );
    }

    const recordFailure = async () => {
      const lockExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await db.insert(credentialChallenges).values({
        id: crypto.randomUUID(),
        staffId: session.staffId,
        challenge: crypto.randomUUID(),
        type: "step_up_failure",
        expiresAt: lockExpiry,
      }).run();
    };

    // ── Live Staff Record Check ──────────────────────────────────────────────
    const callerStaff = await db
      .select({
        id: staff.id,
        email: staff.email,
        role: staff.role,
        isActive: staff.isActive,
        emailVerifiedAt: staff.emailVerifiedAt,
        passwordHash: staff.passwordHash,
      })
      .from(staff)
      .where(eq(staff.id, session.staffId))
      .get();

    if (!callerStaff || !callerStaff.isActive) {
      return NextResponse.json({ error: "Caller account is inactive or not found" }, { status: 403 });
    }

    // ── Factor Hierarchy Evaluation ──────────────────────────────────────────
    const userPasskeys = await db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.staffId, session.staffId))
      .all();

    const isDev = isAuthorizedDeveloper(callerStaff);
    const hasPasskey = userPasskeys.length > 0 || isDev;

    const emailOtpEnrollment = await db
      .select()
      .from(credentialChallenges)
      .where(
        and(
          eq(credentialChallenges.staffId, session.staffId),
          eq(credentialChallenges.type, "email_otp_enrolled")
        )
      )
      .get();
    const hasEmailOtp = Boolean(emailOtpEnrollment);

    if (hasPasskey && factor !== "passkey") {
      return NextResponse.json(
        { error: "Forbidden: Passkey required. Cannot downgrade to OTP or password." },
        { status: 403 }
      );
    }
    if (!hasPasskey && hasEmailOtp && factor === "password") {
      return NextResponse.json(
        { error: "Forbidden: OTP required. Cannot downgrade to password." },
        { status: 403 }
      );
    }

    // ── Factor Verification ──────────────────────────────────────────────────
    if (factor === "passkey") {
      if (!challenge || !passkeyCredential) {
        return NextResponse.json({ error: "Challenge and passkeyCredential required" }, { status: 400 });
      }

      // Atomic challenge consumption bound to staffId, sid, and action
      const consumedChallenge = await db
        .delete(credentialChallenges)
        .where(
          and(
            eq(credentialChallenges.challenge, challenge),
            eq(credentialChallenges.staffId, session.staffId),
            eq(credentialChallenges.type, `step_up:${action}:${session.sid}`),
            gt(credentialChallenges.expiresAt, nowIso)
          )
        )
        .returning()
        .get();

      if (!consumedChallenge) {
        await recordFailure();
        return NextResponse.json({ error: "Invalid, expired, or already used challenge" }, { status: 400 });
      }

      // Hash raw clientDataJSON bytes directly to prevent UTF-8 string encoding drift
      const clientDataBytes = Buffer.from(passkeyCredential.response.clientDataJSON, "base64url");
      let clientData: any;
      try {
        clientData = JSON.parse(clientDataBytes.toString("utf-8"));
      } catch {
        await recordFailure();
        return NextResponse.json({ error: "Invalid clientDataJSON" }, { status: 400 });
      }

      if (clientData.type !== "webauthn.get") {
        await recordFailure();
        return NextResponse.json({ error: "Invalid clientData type" }, { status: 400 });
      }

      // Timing-safe comparison of challenge
      const expectedChalBuf = Buffer.from(challenge, "utf-8");
      const clientChalBuf = Buffer.from(clientData.challenge || "", "utf-8");
      if (
        expectedChalBuf.length !== clientChalBuf.length ||
        !crypto.timingSafeEqual(expectedChalBuf, clientChalBuf)
      ) {
        await recordFailure();
        return NextResponse.json({ error: "Challenge mismatch" }, { status: 400 });
      }

      // Origin check against whitelist
      const clientOrigin = clientData.origin || "";
      const isAllowedOrigin = (orig: string) => {
        try {
          const u = new URL(orig);
          const host = u.host.toLowerCase();
          if (process.env.NODE_ENV !== "production") {
            if (host === "localhost" || host.startsWith("localhost:") || host === "127.0.0.1" || host.startsWith("127.0.0.1:")) return true;
          }
          if (host === "thaiba-hive.vercel.app" || host.endsWith(".thaiba-hive.vercel.app")) return true;
          const configured = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
          return configured.includes(orig.toLowerCase()) || configured.includes(host);
        } catch {
          return false;
        }
      };

      if (!isAllowedOrigin(clientOrigin)) {
        await recordFailure();
        return NextResponse.json({ error: "Invalid origin in clientDataJSON" }, { status: 401 });
      }

      // Authenticator Data validation
      const authData = Buffer.from(passkeyCredential.response.authenticatorData, "base64url");
      if (authData.length < 37) {
        await recordFailure();
        return NextResponse.json({ error: "Authenticator data too short" }, { status: 400 });
      }

      // RP ID verification: strictly from server environment RP_ID, never circular from request origin
      const rpId = process.env.RP_ID || new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").hostname;
      const rpIdHash = authData.subarray(0, 32);
      const expectedRpIdHash = crypto.createHash("sha256").update(rpId).digest();
      if (!crypto.timingSafeEqual(rpIdHash, expectedRpIdHash)) {
        await recordFailure();
        return NextResponse.json({ error: "rpIdHash mismatch" }, { status: 401 });
      }

      const flags = authData[32];
      const userPresent = (flags & 0x01) !== 0;
      const userVerified = (flags & 0x04) !== 0;

      if (!userPresent || !userVerified) {
        await recordFailure();
        return NextResponse.json({ error: "User presence and user verification (UV) are mandatory" }, { status: 401 });
      }

      const signCount = authData.readUInt32BE(33);

      // Look up credential by `credentialId` column, NOT row `id`
      const targetCredId = passkeyCredential.rawId || passkeyCredential.id;
      const credential = await db
        .select()
        .from(webauthnCredentials)
        .where(
          and(
            eq(webauthnCredentials.credentialId, targetCredId),
            eq(webauthnCredentials.staffId, session.staffId)
          )
        )
        .get();

      if (!credential) {
        await recordFailure();
        return NextResponse.json({ error: "Credential not registered for this user" }, { status: 400 });
      }

      // Cryptographic signature verification over raw clientDataBytes hash
      const clientDataHash = crypto.createHash("sha256").update(clientDataBytes).digest();
      const signedData = Buffer.concat([authData, clientDataHash]);
      const sigBuf = Buffer.from(passkeyCredential.response.signature, "base64url");

      try {
        parseDER(sigBuf);
      } catch {
        await recordFailure();
        return NextResponse.json({ error: "Malformed signature format" }, { status: 401 });
      }

      const verifier = crypto.createVerify("SHA256");
      verifier.update(signedData);
      const isValid = verifier.verify(credential.publicKey, sigBuf);

      if (!isValid) {
        await recordFailure();
        return NextResponse.json({ error: "Cryptographic signature verification failed" }, { status: 401 });
      }

      // Counter check and update ONLY executed AFTER signature has cryptographically verified
      if (credential.counter === 0 && signCount === 0) {
        // Multi-device synced passkey (e.g. iCloud Keychain, Google Password Manager)
      } else if (signCount > credential.counter) {
        await db
          .update(webauthnCredentials)
          .set({ counter: signCount, lastUsedAt: new Date().toISOString() })
          .where(eq(webauthnCredentials.id, credential.id))
          .run();
      } else {
        // Counter rollback / clone detected
        await recordFailure();
        return NextResponse.json({ error: "Authenticator counter rollback: possible cloned authenticator" }, { status: 401 });
      }
    } else if (factor === "email_otp") {
      if (!otp) {
        return NextResponse.json({ error: "OTP is required" }, { status: 400 });
      }

      // DB-backed persistent OTP verification (atomic consumption with 5-minute TTL and attempt cap)
      const otpHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");
      const activeOtpRow = await db
        .delete(credentialChallenges)
        .where(
          and(
            eq(credentialChallenges.staffId, session.staffId),
            eq(credentialChallenges.type, "email_otp"),
            eq(credentialChallenges.challenge, otpHash),
            gt(credentialChallenges.expiresAt, nowIso)
          )
        )
        .returning()
        .get();

      if (!activeOtpRow) {
        await recordFailure();
        return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
      }
    } else if (factor === "password") {
      if (!password) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }
      if (!callerStaff.passwordHash) {
        await recordFailure();
        return NextResponse.json({ error: "Password authentication unavailable for this account" }, { status: 400 });
      }
      const verified = await verifyPassword(password, callerStaff.passwordHash);
      if (!verified) {
        await recordFailure();
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    // Reset failure records on successful factor verification
    await db.delete(credentialChallenges).where(
      and(
        eq(credentialChallenges.staffId, session.staffId),
        eq(credentialChallenges.type, "step_up_failure")
      )
    ).run();

    // Mint compact signed action step-up JWT
    const stepUpToken = await createActionStepUpToken({
      staffId: session.staffId,
      sid: session.sid,
      action,
    });

    return NextResponse.json({
      success: true,
      stepUpToken,
    });
  } catch (error) {
    console.error("[StepUpVerify] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
