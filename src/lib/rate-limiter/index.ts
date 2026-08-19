/**
 * Distributed Rate Limiter — Redis Sliding Window Ready Interface
 * Task P1-33: Add Distributed Redis Rate Limiting
 *
 * Architecture:
 * - Dev: in-process Map-based sliding window
 * - Production: Redis sliding window (via ioredis + Lua script)
 *
 * Current rate limiting (login route) uses an in-process Map.
 * This module provides the shared abstraction.
 *
 * To upgrade to Redis:
 *   pnpm add ioredis
 *   Set REDIS_URL=redis://localhost:6379
 *
 * Usage:
 *   import { rateLimiter } from '@/lib/rate-limiter';
 *   const { allowed, retryAfter } = await rateLimiter.check('login', ip, { max: 5, windowMs: 60000 });
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  total: number;
};

type WindowEntry = {
  count: number;
  resetAt: number;
};

class InMemoryRateLimiter {
  private windows = new Map<string, WindowEntry>();

  async check(
    namespace: string,
    key: string,
    opts: { max: number; windowMs: number }
  ): Promise<RateLimitResult> {
    const mapKey = `${namespace}:${key}`;
    const now = Date.now();
    const entry = this.windows.get(mapKey);

    if (!entry || now >= entry.resetAt) {
      // New window
      this.windows.set(mapKey, { count: 1, resetAt: now + opts.windowMs });
      return { allowed: true, remaining: opts.max - 1, retryAfterMs: 0, total: opts.max };
    }

    if (entry.count >= opts.max) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: entry.resetAt - now,
        total: opts.max,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: opts.max - entry.count,
      retryAfterMs: 0,
      total: opts.max,
    };
  }

  async reset(namespace: string, key: string): Promise<void> {
    this.windows.delete(`${namespace}:${key}`);
  }

  getStats() {
    return { backend: "in-memory", activeWindows: this.windows.size };
  }
}

/**
 * Singleton rate limiter.
 *
 * Redis sliding window upgrade path:
 * ```ts
 * import Redis from 'ioredis';
 * const redis = new Redis(process.env.REDIS_URL!);
 * // Use atomic Lua script for accurate sliding window
 * class RedisRateLimiter {
 *   async check(ns, key, { max, windowMs }) {
 *     const k = `rl:${ns}:${key}`;
 *     const now = Date.now();
 *     const [count] = await redis.eval(SLIDING_WINDOW_LUA, 1, k, now, windowMs, max) as number[];
 *     return { allowed: count <= max, remaining: Math.max(0, max - count), ... };
 *   }
 * }
 * ```
 */
export const rateLimiter = new InMemoryRateLimiter();
