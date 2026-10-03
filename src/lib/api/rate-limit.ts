type RateLimitEntry = { count: number; resetAt: number };
type RateLimitStore = Map<string, RateLimitEntry>;

function createStore(): RateLimitStore {
  return new Map<string, RateLimitEntry>();
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
  write: { windowMs: 60_000, max: 30, keyPrefix: "write" },
  read: { windowMs: 60_000, max: 100, keyPrefix: "read" },
  upload: { windowMs: 60_000, max: 10, keyPrefix: "upload" },
};

import { getDistributedRateLimiter } from "../security/rate-limit-redis";

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig | keyof typeof DEFAULT_CONFIGS = "write"
): { allowed: boolean; remaining: number; resetMs: number } {
  // In production, NEVER bypass rate limiting via test flags
  if (process.env.NODE_ENV !== "production") {
    if (
      process.env.ENABLE_RATE_LIMIT !== "true" ||
      process.env.PLAYWRIGHT_TEST === "true" ||
      process.env.CI === "true" ||
      process.env.NODE_ENV === "test"
    ) {
      return { allowed: true, remaining: 999, resetMs: 0 };
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
    if (
      process.env.ENABLE_RATE_LIMIT !== "true" ||
      process.env.PLAYWRIGHT_TEST === "true" ||
      process.env.CI === "true" ||
      process.env.NODE_ENV === "test"
    ) {
      return { allowed: true, remaining: 999, resetMs: 0, retryAfterSeconds: 0 };
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
 * Order of precedence:
 * 1. Vercel Edge Header (x-vercel-forwarded-for)
 * 2. Cloudflare CF-Connecting-IP (if TRUST_CF_CONNECTING_IP === "true" or CF headers verified)
 * 3. Reverse Proxy X-Real-IP
 * 4. Leftmost client IP in validated X-Forwarded-For
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

  // Reverse Proxy X-Real-IP
  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();

  // Parse X-Forwarded-For: leftmost IP is client IP if reverse proxy appends
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[0];
    }
  }

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
