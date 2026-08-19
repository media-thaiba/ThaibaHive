import { NextResponse } from "next/server";
import {
  verifyWebAuthnAssertion,
  verifyOTPCode,
  recordFailedAttempt,
  resetFailedAttempts,
  MAX_FAILED_ATTEMPTS,
} from "@/lib/identity/webauthn-service";
import { createSession, destroySession } from "@thaiba/auth";
import { logIdentityEvent } from "@/lib/identity/identity-audit-events";
import { resolveStepUpIdentity } from "@/lib/identity/stepup-auth-helper";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const identity = await resolveStepUpIdentity(request, body);
  if (!identity) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const staffId = identity.staffId;
  const { challengeId, type, response } = body || {};

  if (type === "otp") {
    const valid = verifyOTPCode(staffId, response);
    if (!valid) {
      const attempts = recordFailedAttempt(staffId);
      await logIdentityEvent({
        eventType: "risk.stepup.failed",
        userId: staffId,
        reason: `Invalid OTP (attempt ${attempts}/${MAX_FAILED_ATTEMPTS})`,
      });

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await destroySession();
        return NextResponse.json(
          { success: false, error: "Session terminated due to excessive failed verification attempts" },
          { status: 403 },
        );
      }

      return NextResponse.json({ success: false, error: "Invalid or expired OTP" }, { status: 400 });
    }
  } else if (type === "webauthn") {
    let userPublicKey: string | undefined;
    try {
      const { webauthnCredentials } = await import("@thaiba/db/schema");
      const cred = await db
        .select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.staffId, staffId))
        .get();
      if (cred?.publicKey) {
        userPublicKey = cred.publicKey;
      }
    } catch {
      // Fallback
    }

    const verifyResult = await verifyWebAuthnAssertion(
      challengeId,
      staffId,
      response,
      userPublicKey,
    );
    if (!verifyResult.valid) {
      const attempts = recordFailedAttempt(staffId);
      await logIdentityEvent({
        eventType: "risk.stepup.failed",
        userId: staffId,
        reason: `WebAuthn assertion failed: ${verifyResult.error} (attempt ${attempts}/${MAX_FAILED_ATTEMPTS})`,
      });

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await destroySession();
        return NextResponse.json(
          { success: false, error: "Session terminated due to excessive failed verification attempts" },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { success: false, error: verifyResult.error || "WebAuthn verification failed" },
        { status: 400 },
      );
    }
  } else {
    return NextResponse.json({ success: false, error: "Invalid verification type" }, { status: 400 });
  }

  // Reset failed attempts on successful verification
  resetFailedAttempts(staffId);

  // Log successful step-up to audit chain
  await logIdentityEvent({
    eventType: "risk.stepup.completed",
    userId: staffId,
  });

  // Query staff record to issue full session token
  const staffMember = await db.select().from(staff).where(eq(staff.id, staffId)).get();
  if (!staffMember) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  const sessionPayload = {
    staffId: staffMember.id,
    email: staffMember.email,
    role: staffMember.role,
    employeeId: staffMember.employeeId,
    name: `${staffMember.firstName} ${staffMember.lastName}`,
    tokenVersion: staffMember.tokenVersion ?? 0,
  };

  const newToken = await createSession(sessionPayload, true);
  return NextResponse.json({ success: true, sessionToken: newToken });
}
