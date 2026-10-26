import { SignJWT, jwtVerify } from "jose";
import { getJwtSecretBytes } from "@thaiba/auth";

export interface MobileNoncePayload {
  staffId: string;
  email: string;
  role: string;
  originSid?: string;
  employeeId?: string | null;
  name?: string;
  tokenVersion?: number;
  targetUrl?: string;
  deviceId?: string;
  institutionId?: string | null;
}

export const NONCE_TTL_SECONDS = 60; // 60 seconds TTL

/**
 * Creates a short-lived single-use mobile authentication handoff nonce as an HMAC-signed JWT
 * using a dedicated HKDF purpose key ("mobile-handoff") so it can never be replayed as a Bearer session JWT (B-09).
 */
export async function createMobileNonce(params: {
  staffId: string;
  email: string;
  role: string;
  originSid?: string;
  employeeId?: string | null;
  name?: string;
  tokenVersion?: number;
  targetUrl?: string;
  deviceId?: string;
  institutionId?: string | null;
}): Promise<{ nonce: string; expiresAt: string; redirectUrl: string }> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = now + NONCE_TTL_SECONDS;
  const expiresAtISO = new Date(expiresAtSeconds * 1000).toISOString();
  const jti = crypto.randomUUID();

  const target = params.targetUrl || "/";

  const nonce = await new SignJWT({
    jti,
    staffId: params.staffId,
    email: params.email,
    role: params.role,
    originSid: params.originSid,
    employeeId: params.employeeId ?? null,
    name: params.name ?? "",
    tokenVersion: params.tokenVersion ?? 0,
    institutionId: params.institutionId ?? null,
    targetUrl: target,
    deviceId: params.deviceId,
    purpose: "mobile_handoff",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(expiresAtSeconds)
    .sign(getJwtSecretBytes("mobile-handoff"));

  const redirectUrl = `/auth/mobile-handoff?nonce=${encodeURIComponent(nonce)}&redirect=${encodeURIComponent(target)}`;

  return {
    nonce,
    expiresAt: expiresAtISO,
    redirectUrl,
  };
}

/**
 * Verifies a mobile handoff nonce JWT. Returns the payload or null if invalid/expired.
 */
export async function verifyMobileNonce(nonce: string): Promise<{
  jti: string;
  staffId: string;
  email: string;
  role: string;
  originSid?: string;
  employeeId?: string | null;
  name?: string;
  tokenVersion?: number;
  targetUrl?: string;
  deviceId?: string;
  institutionId?: string | null;
  exp?: number;
} | null> {
  try {
    const result = await jwtVerify(nonce, getJwtSecretBytes("mobile-handoff"), {
      algorithms: ["HS256"],
    });
    const payload = result.payload as Record<string, unknown>;
    if (payload.purpose !== "mobile_handoff" || !payload.jti || !payload.staffId) {
      return null;
    }
    return payload as unknown as {
      jti: string;
      staffId: string;
      email: string;
      role: string;
      originSid?: string;
      employeeId?: string | null;
      name?: string;
      tokenVersion?: number;
      targetUrl?: string;
      deviceId?: string;
      institutionId?: string | null;
      exp?: number;
    };
  } catch {
    return null;
  }
}
