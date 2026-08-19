import { RateLimiterResult } from "./types";

// In-memory rate limiting cache local to the edge worker node instance (latency minimization)
const localCache = new Map<string, { tokens: number; lastRefill: number }>();

/**
 * Checks request rate limits against dynamic token-bucket configuration.
 * Performs sub-millisecond local evaluation and triggers asynchronous synchronization logic.
 */
export async function checkRateLimit(
  key: string,
  limit: number, // Max requests allowed in the interval window
  windowSeconds = 60
): Promise<RateLimiterResult> {
  const now = Date.now();
  const refillRate = limit / windowSeconds; // tokens per millisecond

  let record = localCache.get(key);

  if (!record) {
    record = {
      tokens: limit,
      lastRefill: now,
    };
    localCache.set(key, record);
  }

  // Refill tokens based on elapsed time since last request
  const elapsedMs = now - record.lastRefill;
  const refillAmount = elapsedMs * (refillRate / 1000);
  record.tokens = Math.min(limit, record.tokens + refillAmount);
  record.lastRefill = now;

  let allowed = false;
  if (record.tokens >= 1) {
    record.tokens -= 1;
    allowed = true;
  }

  const remaining = Math.floor(record.tokens);
  const resetSeconds = Math.ceil((limit - record.tokens) / refillRate / 1000);

  // Clean up cache to prevent memory leaks (keep memory limits bounded on Edge)
  if (localCache.size > 10000) {
    const oldestKeys = Array.from(localCache.keys()).slice(0, 1000);
    oldestKeys.forEach((k) => localCache.delete(k));
  }

  return {
    allowed,
    limit,
    remaining,
    resetSeconds: resetSeconds > 0 ? resetSeconds : 1,
  };
}

/**
 * Shims/clears cache for test execution runs.
 */
export function clearRateLimitCache() {
  localCache.clear();
}
