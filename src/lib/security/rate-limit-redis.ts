/**
 * Distributed Redis Rate Limit Adapter with Atomic Lua Scripting
 * Sprint-038 / AGS-002
 */

import { RateLimitRule, RateLimitResult, RateLimitDimension } from "./rate-limit-types";
import { LocalFallbackStore } from "./rate-limit-fallback";

export interface IRedisRateLimitClient {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
  ping(): Promise<string>;
  isOpen?: boolean;
}

export class RedisRateLimiterAdapter {
  private redisClient: IRedisRateLimitClient | null = null;
  private fallbackStore: LocalFallbackStore;
  private isConnected: boolean = false;

  // Atomic Lua script for sliding-window log rate limiting:
  // KEYS[1] = rate limit key
  // ARGV[1] = current timestamp (ms)
  // ARGV[2] = window size (ms)
  // ARGV[3] = max allowed requests
  // ARGV[4] = unique member identifier (ms:random)
  private readonly SLIDING_WINDOW_LUA = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local member = ARGV[4]

    local clearBefore = now - window
    redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)

    local currentRequests = redis.call('ZCARD', key)
    if currentRequests < limit then
      redis.call('ZADD', key, now, member)
      redis.call('PEXPIRE', key, window * 2)
      return { 1, limit - currentRequests - 1, 0 }
    else
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local resetMs = now + window
      if #oldest >= 2 then
        resetMs = tonumber(oldest[2]) + window
      end
      local retryAfter = math.ceil((resetMs - now) / 1000)
      if retryAfter < 1 then retryAfter = 1 end
      return { 0, 0, retryAfter, resetMs }
    end
  `;

  constructor(redisClient?: IRedisRateLimitClient | null) {
    this.fallbackStore = new LocalFallbackStore();
    if (redisClient) {
      this.redisClient = redisClient;
      this.isConnected = true;
    }
  }

  public setRedisClient(client: IRedisRateLimitClient | null): void {
    this.redisClient = client;
    this.isConnected = client !== null;
    if (!this.isConnected) {
      this.fallbackStore.activateFallback("Redis client explicitly set to null or disconnected");
    } else {
      this.fallbackStore.deactivateFallback();
    }
  }

  public getFallbackStore(): LocalFallbackStore {
    return this.fallbackStore;
  }

  public isUsingFallback(): boolean {
    return !this.isConnected || this.fallbackStore.isFallbackActive();
  }

  /**
   * Evaluates request rate limit against Redis cluster, falling back transparently on error.
   */
  public async evaluate(
    key: string,
    rule: RateLimitRule,
    dimension: RateLimitDimension = "compound",
    nowMs: number = Date.now()
  ): Promise<RateLimitResult> {
    if (!this.redisClient || !this.isConnected) {
      this.fallbackStore.activateFallback("Redis unavailable");
      return this.fallbackStore.evaluate(key, rule, dimension, nowMs);
    }

    try {
      const member = `${nowMs}:${Math.random().toString(36).substring(2, 9)}`;
      const result = (await this.redisClient.eval(
        this.SLIDING_WINDOW_LUA,
        1,
        key,
        nowMs,
        rule.windowMs,
        rule.maxRequests,
        member
      )) as [number, number, number, number?];

      const allowed = result[0] === 1;
      const remaining = result[1];
      const retryAfterSeconds = result[2];
      const resetMs = result[3] ?? (nowMs + rule.windowMs);

      return {
        allowed,
        totalLimit: rule.maxRequests,
        remaining,
        resetMs,
        retryAfterSeconds,
        dimension,
        key,
      };
    } catch (err: unknown) {
      this.isConnected = false;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.fallbackStore.activateFallback(`Redis eval failed: ${errorMsg}`);
      return this.fallbackStore.evaluate(key, rule, dimension, nowMs);
    }
  }

  public reset(): void {
    this.fallbackStore.reset();
  }
}

/**
 * Lightweight HTTP-based Upstash / Redis REST Client for Serverless & Edge runtimes.
 * Does not require TCP sockets or native binary packages.
 */
export class UpstashRedisClient implements IRedisRateLimitClient {
  private url: string;
  private token: string;

  constructor(url?: string, token?: string) {
    this.url = (url || process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_URL || "").replace(/\/$/, "");
    this.token = token || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_TOKEN || "";
  }

  public isConfigured(): boolean {
    return Boolean(this.url && this.token);
  }

  public async ping(): Promise<string> {
    const res = await fetch(`${this.url}/ping`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (!res.ok) throw new Error(`Upstash ping failed: ${res.statusText}`);
    const data = await res.json();
    return data.result || "PONG";
  }

  public async eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown> {
    const res = await fetch(`${this.url}/eval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([script, numKeys, ...args]),
    });

    if (!res.ok) {
      throw new Error(`Upstash eval failed with HTTP status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(`Upstash error: ${data.error}`);
    }

    return data.result;
  }
}

let globalLimiter: RedisRateLimiterAdapter | null = null;

export function getDistributedRateLimiter(): RedisRateLimiterAdapter {
  if (!globalLimiter) {
    const upstash = new UpstashRedisClient();
    if (upstash.isConfigured()) {
      globalLimiter = new RedisRateLimiterAdapter(upstash);
    } else {
      globalLimiter = new RedisRateLimiterAdapter(null);
    }
  }
  return globalLimiter;
}

export function resetGlobalDistributedRateLimiter(): void {
  globalLimiter = null;
}

