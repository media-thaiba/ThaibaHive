type RateLimitEntry = { count: number; resetAt: number };

/**
 * Bounded in-memory rate-limit store with LRU eviction and TTL cleanup.
 *
 * The previous implementation used a raw Map that never deleted expired entries,
 * so every unique identifier (IP, staffId) that ever hit a rate-limited route
 * left a permanent entry. Under a DDoS with rotating identifiers or a large
 * multi-tenant deployment, this leaked memory until the process OOM-killed.
 *
 * Fixes:
 *  - Max key cap (default 10_000) with LRU eviction on overflow.
 *  - Expired entries are deleted on read (lazy TTL) and via periodic sweep.
 *  - LRU order is maintained by re-inserting accessed keys.
 */
class BoundedRateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly maxKeys: number;
  private lastSweep = 0;
  private readonly sweepIntervalMs: number;

  constructor(maxKeys = 10_000, sweepIntervalMs = 60_000) {
    this.maxKeys = maxKeys;
    this.sweepIntervalMs = sweepIntervalMs;
  }

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    // Expired? Clean on read so the key doesn't linger.
    if (Date.now() > entry.resetAt) {
      this.store.delete(key);
      return undefined;
    }

    // Refresh LRU order (delete + re-insert moves key to "most recently used").
    this.store.delete(key);
    this.store.set(key, entry);
    return entry;
  }

  set(key: string, entry: RateLimitEntry): void {
    // Evict the least-recently-used entry (first in insertion order) if at capacity.
    if (this.store.size >= this.maxKeys && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, entry);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  get size(): number {
    return this.store.size;
  }

  /** Periodic passive sweep for expired entries. Call on a timer or opportunistically. */
  sweep(): void {
    const now = Date.now();
    if (now - this.lastSweep < this.sweepIntervalMs) return;
    this.lastSweep = now;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

type RateLimitStore = BoundedRateLimitStore;

const DEFAULT_STORE_MAX_KEYS = 10_000;

function createStore(): RateLimitStore {
  return new BoundedRateLimitStore(DEFAULT_STORE_MAX_KEYS);
}

const stores: Record<string, RateLimitStore> = {};

function getStore(name: string): RateLimitStore {
  if (!stores[name]) stores[name] = createStore();
  return stores[name];
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60_000, max: 5, keyPrefix: "auth" },
  "auth-signup": { windowMs: 60_000, max: 3, keyPrefix: "auth-signup" },
  authForgotPassword: { windowMs: 60_000, max: 3, keyPrefix: "auth-forgot-password" },
  authVerifyResend: { windowMs: 60_000, max: 3, keyPrefix: "auth-verify-resend" },
  write: { windowMs: 60_000, max: 30, keyPrefix: "write" },
  read: { windowMs: 60_000, max: 100, keyPrefix: "read" },
  upload: { windowMs: 60_000, max: 10, keyPrefix: "upload" },
  search: { windowMs: 60_000, max: 30, keyPrefix: "search" },
};

import { getDistributedRateLimiter } from "../security/rate-limit-redis";

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig | keyof typeof DEFAULT_CONFIGS = "write"
): { allowed: boolean; remaining: number; resetMs: number } {
  // In production, NEVER bypass rate limiting via test flags
  if (process.env.NODE_ENV !== "production") {
    if (process.env.ENABLE_RATE_LIMIT !== "true") {
      if (
        process.env.PLAYWRIGHT_TEST === "true" ||
        process.env.CI === "true" ||
        process.env.NODE_ENV === "test"
      ) {
        return { allowed: true, remaining: 999, resetMs: 0 };
      }
    }
  }

  const resolved = typeof config === "string" ? DEFAULT_CONFIGS[config] : config;
  const storeName = resolved.keyPrefix ?? "default";
  const store = getStore(storeName);
  const now = Date.now();
  const key = `${resolved.keyPrefix ?? ""}:${identifier}`;

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + resolved.windowMs });
    return { allowed: true, remaining: resolved.max - 1, resetMs: resolved.windowMs };
  }

  if (entry.count >= resolved.max) {
    return { allowed: false, remaining: 0, resetMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: resolved.max - entry.count, resetMs: entry.resetAt - now };
}

export async function checkDistributedRateLimit(
  identifier: string,
  config: RateLimitConfig | keyof typeof DEFAULT_CONFIGS = "write"
): Promise<{ allowed: boolean; remaining: number; resetMs: number; retryAfterSeconds: number }> {
  // In production, NEVER bypass rate limiting via test flags
  if (process.env.NODE_ENV !== "production") {
    if (process.env.ENABLE_RATE_LIMIT !== "true") {
      if (
        process.env.PLAYWRIGHT_TEST === "true" ||
        process.env.CI === "true" ||
        process.env.NODE_ENV === "test"
      ) {
        return { allowed: true, remaining: 999, resetMs: 0, retryAfterSeconds: 0 };
      }
    }
  }

  const resolved = typeof config === "string" ? DEFAULT_CONFIGS[config] : config;
  const limiter = getDistributedRateLimiter();
  const key = `${resolved.keyPrefix ?? "default"}:${identifier}`;

  const res = await limiter.evaluate(key, {
    windowMs: resolved.windowMs,
    maxRequests: resolved.max,
  });

  return {
    allowed: res.allowed,
    remaining: res.remaining,
    resetMs: res.resetMs,
    retryAfterSeconds: res.retryAfterSeconds,
  };
}

/**
 * Extracts client IP using trusted reverse proxy / edge headers.
 * Standard reverse proxies (Nginx, Caddy, AWS ALB, Cloudflare, etc.) append the connecting client IP
 * on the right of X-Forwarded-For. Reading leftmost allows clients to prepend spoofed IP addresses.
 * Therefore, we parse the rightmost valid IP address to guarantee anti-spoofing integrity.
 */
export function extractIp(request: Request): string {
  // If running on Vercel, x-vercel-forwarded-for is set by Vercel edge and cannot be forged by clients
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp && vercelIp.trim()) {
    const parts = vercelIp.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
  }

  // Cloudflare CF-Connecting-IP is trusted when explicitly configured or in Cloudflare environment
  if (process.env.TRUST_CF_CONNECTING_IP === "true") {
    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp && cfIp.trim()) return cfIp.trim();
  }

  // Parse X-Forwarded-For: rightmost IP is the authentic connecting client appended by the reverse proxy
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  // Reverse Proxy X-Real-IP
  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();

  return "unknown";
}

export function rateLimitResponse(resetMs: number): Response {
  const retryAfter = Math.ceil(resetMs / 1000);
  return Response.json(
    { error: `Rate limit exceeded. Try again in ${retryAfter}s.` },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": "varies",
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
