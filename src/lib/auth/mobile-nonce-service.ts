import { randomBytes } from "crypto";

export interface MobileNoncePayload {
  staffId: string;
  email: string;
  role: string;
  employeeId?: string | null;
  name?: string;
  tokenVersion?: number;
  targetUrl?: string;
  deviceId?: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory nonce store with TTL expiration
const nonceStore = new Map<string, MobileNoncePayload>();
const NONCE_TTL_MS = 60_000; // 60 seconds TTL

/**
 * Creates a short-lived single-use mobile authentication handoff nonce.
 */
export async function createMobileNonce(params: {
  staffId: string;
  email: string;
  role: string;
  employeeId?: string | null;
  name?: string;
  tokenVersion?: number;
  targetUrl?: string;
  deviceId?: string;
}): Promise<{ nonce: string; expiresAt: string; redirectUrl: string }> {
  const nonce = `mhn_${randomBytes(16).toString("hex")}`;
  const now = Date.now();
  const expiresAtMs = now + NONCE_TTL_MS;
  const expiresAtISO = new Date(expiresAtMs).toISOString();

  const payload: MobileNoncePayload = {
    ...params,
    createdAt: now,
    expiresAt: expiresAtMs,
  };

  nonceStore.set(nonce, payload);

  // Clean up expired nonces
  cleanExpiredNonces();

  const target = params.targetUrl || "/";
  const redirectUrl = `/auth/mobile-handoff?nonce=${nonce}&redirect=${encodeURIComponent(target)}`;

  return {
    nonce,
    expiresAt: expiresAtISO,
    redirectUrl,
  };
}

/**
 * Verifies and burns (deletes) a mobile handoff nonce. Returns null if invalid or expired.
 */
export async function verifyAndBurnNonce(nonce: string): Promise<MobileNoncePayload | null> {
  cleanExpiredNonces();

  const payload = nonceStore.get(nonce);
  if (!payload) {
    return null;
  }

  // Immediately burn nonce (single-use guarantee)
  nonceStore.delete(nonce);

  if (Date.now() > payload.expiresAt) {
    return null;
  }

  return payload;
}

/**
 * Utility to clear expired nonces from memory store.
 */
function cleanExpiredNonces(): void {
  const now = Date.now();
  for (const [nonce, payload] of nonceStore.entries()) {
    if (now > payload.expiresAt) {
      nonceStore.delete(nonce);
    }
  }
}
