/**
 * In-memory replay prevention store for SIS webhook requests (Gate 18).
 * Scoped by connectorId and nonce with bounded TTL eviction.
 */

const nonceCache = new Map<string, number>();

export function clearWebhookNonceCache(): void {
  nonceCache.clear();
}

export function cleanExpiredNonces(): void {
  const now = Date.now();
  for (const [key, expiresAt] of nonceCache.entries()) {
    if (expiresAt <= now) {
      nonceCache.delete(key);
    }
  }
}

export function hasWebhookNonce(key: string): boolean {
  cleanExpiredNonces();
  return nonceCache.has(key);
}

export function recordWebhookNonce(key: string, ttlSeconds: number): void {
  nonceCache.set(key, Date.now() + ttlSeconds * 1000);
}
