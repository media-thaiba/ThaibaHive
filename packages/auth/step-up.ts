import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";
import { getJwtSecretBytes } from "./config";
import { stepUpUsed } from "@thaiba/db/schema";

export interface ActionStepUpPayload {
  staffId: string;
  sid: string;
  action: string;
  jti: string;
}

export async function createActionStepUpToken(params: {
  staffId: string;
  sid: string;
  action: string;
}): Promise<string> {
  const jti = `jti_${crypto.randomUUID()}`;
  return await new SignJWT({
    staffId: params.staffId,
    sid: params.sid,
    action: params.action,
  })
    .setProtectedHeader({ alg: "HS256", typ: "thaiba-action-step-up" })
    .setAudience("thaiba:action")
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getJwtSecretBytes("action-step-up"));
}

export async function verifyActionStepUpToken(
  token: string,
  expected: { staffId: string; sid: string; action: string }
): Promise<{ success: true; payload: ActionStepUpPayload; exp: number } | { success: false; error: string }> {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, getJwtSecretBytes("action-step-up"), {
      audience: "thaiba:action",
    });

    if (protectedHeader.typ !== "thaiba-action-step-up") {
      return { success: false, error: "INVALID_TYP" };
    }
    if ((payload as any).stepUpPending === true) {
      return { success: false, error: "LOGIN_PENDING_STEP_UP_REJECTED" };
    }
    if (!payload.jti || typeof payload.jti !== "string") {
      return { success: false, error: "MISSING_JTI" };
    }
    if (payload.staffId !== expected.staffId) {
      return { success: false, error: "STAFF_ID_MISMATCH" };
    }
    if (payload.sid !== expected.sid) {
      return { success: false, error: "SID_MISMATCH" };
    }
    if (payload.action !== expected.action) {
      return { success: false, error: "ACTION_MISMATCH" };
    }
    const exp = typeof payload.exp === "number" ? payload.exp * 1000 : Date.now() + 300_000;

    return {
      success: true,
      payload: {
        staffId: payload.staffId as string,
        sid: payload.sid as string,
        action: payload.action as string,
        jti: payload.jti,
      },
      exp,
    };
  } catch (err: any) {
    if (err?.code === "ERR_JWT_EXPIRED") {
      return { success: false, error: "TOKEN_EXPIRED" };
    }
    return { success: false, error: err?.message || "VERIFICATION_FAILED" };
  }
}

/**
 * Consumes the step-up token's jti in the action transaction.
 * Primary-key collision on step_up_used(jti) indicates a replay attack and aborts.
 */
export async function consumeStepUpTokenInTx(
  tx: any,
  stepUp: { jti: string; staffId: string; action: string; exp: number }
): Promise<void> {
  await tx.insert(stepUpUsed).values({
    jti: stepUp.jti,
    staffId: stepUp.staffId,
    action: stepUp.action,
    expiresAt: stepUp.exp,
    usedAt: Date.now(),
  });
}
