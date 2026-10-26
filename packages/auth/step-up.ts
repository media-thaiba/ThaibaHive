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
  expected: { staffId: string; sid: string; action: string | string[] }
): Promise<{ success: true; payload: ActionStepUpPayload; exp: number } | { success: false; error: string }> {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, getJwtSecretBytes("action-step-up"), {
      audience: "thaiba:action",
    });

    if (protectedHeader.typ !== "thaiba-action-step-up") {
      return { success: false, error: "INVALID_TYP" };
    }
    if ((payload as Record<string, unknown>).stepUpPending === true) {
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
    const actionAllowed = Array.isArray(expected.action)
      ? expected.action.includes(payload.action as string)
      : payload.action === expected.action;
    if (!actionAllowed) {
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
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "ERR_JWT_EXPIRED") {
      return { success: false, error: "TOKEN_EXPIRED" };
    }
    return { success: false, error: (err as { message?: string })?.message || "VERIFICATION_FAILED" };
  }
}

/**
 * Consumes the step-up token's jti in the action transaction.
 * Primary-key collision on step_up_used(jti) indicates a replay attack and aborts.
 */
export async function consumeStepUpTokenInTx(
  tx: unknown,
  stepUp: { jti: string; staffId: string; action: string; exp: number }
): Promise<void> {
  const txInsertable = tx as {
    insert: (table: unknown) => {
      values: (values: unknown) => Promise<unknown>;
    };
  };
  await txInsertable.insert(stepUpUsed).values({
    jti: stepUp.jti,
    staffId: stepUp.staffId,
    action: stepUp.action,
    expiresAt: stepUp.exp,
    usedAt: Date.now(),
  });
}


/**
 * Robust detection of primary-key / unique constraint violations on step_up_used
 * across both SQLite/LibSQL and PostgreSQL/PGlite.
 */
export function isStepUpReplayError(txErr: unknown): boolean {
  if (!txErr) return false;

  const allMessages = [
    (txErr as { message?: string })?.message,
    (txErr as { cause?: { message?: string } })?.cause?.message,
    (txErr as { cause?: { cause?: { message?: string } } })?.cause?.cause?.message,
    String(txErr),
  ]
    .filter(Boolean)
    .join(' ');

  const errObj = (typeof txErr === "object" && txErr !== null ? txErr : {}) as Record<string, unknown>;
  const causeObj = (typeof errObj.cause === "object" && errObj.cause !== null ? errObj.cause : {}) as Record<string, unknown>;

  const allCodes = [
    errObj.code,
    errObj.rawCode,
    causeObj.code,
    causeObj.rawCode,
  ].filter(Boolean);

  const isConstraintCode =
    allCodes.includes('23505') ||
    allCodes.includes('SQLITE_CONSTRAINT_PRIMARYKEY') ||
    allCodes.includes('SQLITE_CONSTRAINT_UNIQUE');

  const mentionsStepUpTable =
    allMessages.includes('step_up_used') ||
    allMessages.includes('jti');

  return (
    (isConstraintCode && mentionsStepUpTable) ||
    allMessages.includes('step_up_used_pkey') ||
    allMessages.includes('step_up_used.jti') ||
    allMessages.includes('step_up_used.PRIMARY')
  );
}
