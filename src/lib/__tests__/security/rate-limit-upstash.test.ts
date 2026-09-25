import {
  UpstashRedisClient,
  RedisRateLimiterAdapter,
  getDistributedRateLimiter,
  resetGlobalDistributedRateLimiter,
} from "../../security/rate-limit-redis";
import { checkDistributedRateLimit } from "../../api/rate-limit";

describe("Distributed Serverless Rate Limiting (Upstash / Redis REST Adapter)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetGlobalDistributedRateLimiter();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    resetGlobalDistributedRateLimiter();
  });

  it("should configure Upstash client from environment variables", () => {
    const client = new UpstashRedisClient(
      "https://test-cluster.upstash.io",
      "mock-upstash-token"
    );
    expect(client.isConfigured()).toBe(true);
  });

  it("should execute rate limit eval via Upstash HTTP REST API successfully", async () => {
    // Mock successful Upstash REST eval response [allowed=1, remaining=4, retryAfter=0, resetMs=1700000000000]
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: [1, 4, 0, Date.now() + 60000],
      }),
    });

    const upstash = new UpstashRedisClient("https://upstash.io", "token");
    const adapter = new RedisRateLimiterAdapter(upstash);

    const result = await adapter.evaluate("test-user-ip", {
      windowMs: 60000,
      maxRequests: 5,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(adapter.isUsingFallback()).toBe(false);
  });

  it("should automatically fall back to local in-memory store when Upstash HTTP call fails", async () => {
    // Mock Upstash REST network error
    global.fetch = jest.fn().mockRejectedValue(new Error("Upstash connection timeout"));

    const upstash = new UpstashRedisClient("https://upstash.io", "token");
    const adapter = new RedisRateLimiterAdapter(upstash);

    // Initial evaluation should catch the network error and transparently fallback to LocalFallbackStore
    const result = await adapter.evaluate("test-fallback-ip", {
      windowMs: 60000,
      maxRequests: 3,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(adapter.isUsingFallback()).toBe(true);
  });

  it("should respect rate limit ceilings in local fallback mode", async () => {
    const adapter = new RedisRateLimiterAdapter(null); // null Redis client = pure fallback mode
    const rule = { windowMs: 60000, maxRequests: 2 };

    const res1 = await adapter.evaluate("user-1", rule);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(1);

    const res2 = await adapter.evaluate("user-1", rule);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(0);

    const res3 = await adapter.evaluate("user-1", rule);
    expect(res3.allowed).toBe(false);
    expect(res3.remaining).toBe(0);
    expect(res3.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("should verify checkDistributedRateLimit helper", async () => {
    process.env.ENABLE_RATE_LIMIT = "true";
    try {
      const res = await checkDistributedRateLimit("distributed-ip-001", {
        windowMs: 60000,
        max: 5,
        keyPrefix: "test-dist",
      });

      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(4);
    } finally {
      delete process.env.ENABLE_RATE_LIMIT;
    }
  });
});
