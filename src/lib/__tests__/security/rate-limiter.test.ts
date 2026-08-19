/**
 * Unit Tests for RateLimiter and SlidingWindowLimiter
 * Sprint-038 / AGS-001
 */

import { SlidingWindowLimiter } from "../../security/sliding-window";
import { RateLimiter, DEFAULT_TIER_RULES } from "../../security/rate-limiter";
import { RateLimitRule } from "../../security/rate-limit-types";

describe("SlidingWindowLimiter Core (AGS-001)", () => {
  let limiter: SlidingWindowLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowLimiter(100_000);
  });

  afterEach(() => {
    limiter.destroy();
  });

  it("should allow requests under the limit and track remaining count", () => {
    const rule: RateLimitRule = { windowMs: 10_000, maxRequests: 3 };
    const key = "user-123";
    const now = 1_000_000;

    const res1 = limiter.evaluateWindow(key, rule, "user", now);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);
    expect(res1.totalLimit).toBe(3);

    const res2 = limiter.evaluateWindow(key, rule, "user", now + 100);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.evaluateWindow(key, rule, "user", now + 200);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);

    const res4 = limiter.evaluateWindow(key, rule, "user", now + 300);
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("should slide the window and allow new requests after previous ones expire", () => {
    const rule: RateLimitRule = { windowMs: 1_000, maxRequests: 2 };
    const key = "user-slide";
    let now = 1_000_000;

    expect(limiter.evaluateWindow(key, rule, "user", now).allowed).toBe(true);
    expect(limiter.evaluateWindow(key, rule, "user", now + 100).allowed).toBe(true);
    expect(limiter.evaluateWindow(key, rule, "user", now + 200).allowed).toBe(false);

    // Advance time past the 1st request window
    now += 1_050;
    const resAfterSlide = limiter.evaluateWindow(key, rule, "user", now);
    expect(resAfterSlide.allowed).toBe(true);
  });

  it("should evaluate token bucket algorithm with refill rate", () => {
    const rule: RateLimitRule = {
      windowMs: 10_000,
      maxRequests: 5,
      burstAllowance: 5,
      refillRatePerSecond: 2,
    };
    const key = "token-bucket-test";
    let now = 1_000_000;

    // Consume all 5 tokens
    for (let i = 0; i < 5; i++) {
      const res = limiter.evaluateTokenBucket(key, rule, 1, "compound", now);
      expect(res.allowed).toBe(true);
    }

    // 6th request fails
    const rejected = limiter.evaluateTokenBucket(key, rule, 1, "compound", now);
    expect(rejected.allowed).toBe(false);

    // Advance 1 second -> should refill 2 tokens
    now += 1_000;
    const refillRes1 = limiter.evaluateTokenBucket(key, rule, 1, "compound", now);
    expect(refillRes1.allowed).toBe(true);

    const refillRes2 = limiter.evaluateTokenBucket(key, rule, 1, "compound", now);
    expect(refillRes2.allowed).toBe(true);

    const refillRes3 = limiter.evaluateTokenBucket(key, rule, 1, "compound", now);
    expect(refillRes3.allowed).toBe(false);
  });

  it("should prune stale windows properly without memory leaks", () => {
    const rule: RateLimitRule = { windowMs: 1_000, maxRequests: 5 };
    const now = 1_000_000;

    limiter.evaluateWindow("key-1", rule, "ip", now);
    limiter.evaluateWindow("key-2", rule, "ip", now);

    expect(limiter.pruneStaleWindows(now + 1_000)).toBe(0);
    // After expiry (windowMs * 2 = 2000ms)
    expect(limiter.pruneStaleWindows(now + 3_000)).toBe(2);
  });
});

describe("RateLimiter Orchestrator (AGS-001)", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  it("should generate compound keys correctly for authenticated and anonymous requests", () => {
    const anonKey = rateLimiter.buildCompoundKey({ ip: "192.168.1.1" }, "query");
    expect(anonKey).toBe("ratelimit:global:anon:192.168.1.1:query");

    const authKey = rateLimiter.buildCompoundKey(
      {
        ip: "10.0.0.1",
        tenantId: "tenant-a",
        userId: "user-42",
        role: "admin",
        dpopThumbprint: "jkt-xyz",
      },
      "mutation"
    );
    expect(authKey).toBe("ratelimit:tenant-a:admin:jkt-xyz:user-42:mutation");
  });

  it("should evaluate default tier rules properly", () => {
    const result = rateLimiter.evaluate({ ip: "127.0.0.1" }, "auth");
    expect(result.allowed).toBe(true);
    expect(result.totalLimit).toBe(DEFAULT_TIER_RULES.auth.maxRequests);
  });
});
