/**
 * Unit Tests for RedisRateLimiterAdapter
 * Sprint-038 / AGS-002
 */

import { RedisRateLimiterAdapter, IRedisRateLimitClient } from "../../security/rate-limit-redis";

describe("RedisRateLimiterAdapter (AGS-002)", () => {
  it("should evaluate limits using mock Redis client when connected", async () => {
    let callCount = 0;
    const mockClient: IRedisRateLimitClient = {
      eval: jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          return [1, 2 - callCount, 0, Date.now() + 60000];
        }
        return [0, 0, 30, Date.now() + 30000];
      }),
      ping: jest.fn().mockResolvedValue("PONG"),
    };

    const adapter = new RedisRateLimiterAdapter(mockClient);
    const rule = { windowMs: 60000, maxRequests: 2 };

    const res1 = await adapter.evaluate("key-1", rule);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(1);

    const res2 = await adapter.evaluate("key-1", rule);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(0);

    const res3 = await adapter.evaluate("key-1", rule);
    expect(res3.allowed).toBe(false);
    expect(res3.retryAfterSeconds).toBe(30);
    expect(mockClient.eval).toHaveBeenCalledTimes(3);
  });

  it("should gracefully switch to in-memory fallback on Redis eval error", async () => {
    const failingClient: IRedisRateLimitClient = {
      eval: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")),
      ping: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    };

    const adapter = new RedisRateLimiterAdapter(failingClient);
    const rule = { windowMs: 60000, maxRequests: 1 };

    // First request trips error and activates fallback
    const res1 = await adapter.evaluate("failing-key", rule);
    expect(res1.allowed).toBe(true);
    expect(adapter.isUsingFallback()).toBe(true);

    // Second request handled by fallback store
    const res2 = await adapter.evaluate("failing-key", rule);
    expect(res2.allowed).toBe(false);
  });

  it("should automatically use fallback when initialized without Redis client", async () => {
    const adapter = new RedisRateLimiterAdapter(null);
    expect(adapter.isUsingFallback()).toBe(true);

    const res = await adapter.evaluate("null-client-key", { windowMs: 10000, maxRequests: 5 });
    expect(res.allowed).toBe(true);
  });
});
