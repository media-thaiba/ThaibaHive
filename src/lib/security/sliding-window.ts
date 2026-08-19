/**
 * Sliding-Window Counter & Token Bucket Implementation
 * Sprint-038: Distributed Adaptive Rate Limiting
 */

import { RateLimitRule, RateLimitResult, RateLimitDimension, SlidingWindowBucket, TokenBucketState } from "./rate-limit-types";

export class SlidingWindowLimiter {
  private windows: Map<string, SlidingWindowBucket> = new Map();
  private tokenBuckets: Map<string, TokenBucketState> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(autoCleanupMs: number = 60_000) {
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.pruneStaleWindows(), autoCleanupMs);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Evaluates a request against the sliding-window log.
   */
  public evaluateWindow(
    key: string,
    rule: RateLimitRule,
    dimension: RateLimitDimension = "compound",
    nowMs: number = Date.now()
  ): RateLimitResult {
    const windowStart = nowMs - rule.windowMs;
    let bucket = this.windows.get(key);

    if (!bucket) {
      bucket = {
        timestamps: [],
        expiresAt: nowMs + rule.windowMs * 2,
      };
      this.windows.set(key, bucket);
    }

    // Filter out timestamps outside the sliding window
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);
    bucket.expiresAt = nowMs + rule.windowMs * 2;

    const currentCount = bucket.timestamps.length;
    const allowed = currentCount < rule.maxRequests;

    if (allowed) {
      bucket.timestamps.push(nowMs);
    }

    const remaining = Math.max(0, rule.maxRequests - (allowed ? currentCount + 1 : currentCount));
    const oldestTimestamp = bucket.timestamps.length > 0 ? bucket.timestamps[0] : nowMs;
    const resetMs = oldestTimestamp + rule.windowMs;
    const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil((resetMs - nowMs) / 1000));

    return {
      allowed,
      totalLimit: rule.maxRequests,
      remaining,
      resetMs,
      retryAfterSeconds,
      dimension,
      key,
    };
  }

  /**
   * Evaluates a request against the token bucket algorithm.
   */
  public evaluateTokenBucket(
    key: string,
    rule: RateLimitRule,
    tokensRequested: number = 1,
    dimension: RateLimitDimension = "compound",
    nowMs: number = Date.now()
  ): RateLimitResult {
    const maxCapacity = rule.burstAllowance ?? rule.maxRequests;
    const refillRate = rule.refillRatePerSecond ?? rule.maxRequests / (rule.windowMs / 1000);

    let state = this.tokenBuckets.get(key);
    if (!state) {
      state = {
        tokens: maxCapacity,
        lastRefillMs: nowMs,
      };
      this.tokenBuckets.set(key, state);
    }

    // Refill tokens based on elapsed time
    const elapsedSeconds = Math.max(0, (nowMs - state.lastRefillMs) / 1000);
    const addedTokens = elapsedSeconds * refillRate;
    state.tokens = Math.min(maxCapacity, state.tokens + addedTokens);
    state.lastRefillMs = nowMs;

    const allowed = state.tokens >= tokensRequested;
    if (allowed) {
      state.tokens -= tokensRequested;
    }

    const remaining = Math.floor(state.tokens);
    const missingTokens = Math.max(0, tokensRequested - state.tokens);
    const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil(missingTokens / refillRate));
    const resetMs = nowMs + Math.ceil(((maxCapacity - state.tokens) / refillRate) * 1000);

    return {
      allowed,
      totalLimit: maxCapacity,
      remaining,
      resetMs,
      retryAfterSeconds,
      dimension,
      key,
    };
  }

  /**
   * Periodic pruning of expired window buckets to prevent memory leaks.
   */
  public pruneStaleWindows(nowMs: number = Date.now()): number {
    let prunedCount = 0;
    for (const [key, bucket] of this.windows.entries()) {
      if (bucket.expiresAt < nowMs) {
        this.windows.delete(key);
        prunedCount++;
      }
    }
    return prunedCount;
  }

  /**
   * Reset all state (useful for tests or administrative resets).
   */
  public reset(): void {
    this.windows.clear();
    this.tokenBuckets.clear();
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.reset();
  }
}
