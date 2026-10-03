import { checkRateLimit, checkDistributedRateLimit, extractIp } from "../api/rate-limit";

describe("Distributed Rate Limiting & Proxy IP Hardening (Task A4 / Blocker B5)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Production Environment Enforcement", () => {
    it("should strictly enforce rate limiting in production even when PLAYWRIGHT_TEST=true", async () => {
      Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true });
      process.env.PLAYWRIGHT_TEST = "true";

      const key = `test_prod_${Date.now()}`;
      const config = { windowMs: 60_000, max: 2, keyPrefix: "test" };

      const r1 = await checkDistributedRateLimit(key, config);
      expect(r1.allowed).toBe(true);

      const r2 = await checkDistributedRateLimit(key, config);
      expect(r2.allowed).toBe(true);

      const r3 = await checkDistributedRateLimit(key, config);
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
    });

    it("should strictly enforce rate limiting in production even when CI=true", () => {
      Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true });
      process.env.CI = "true";

      const key = `test_ci_${Date.now()}`;
      const config = { windowMs: 60_000, max: 1, keyPrefix: "test_sync" };

      const r1 = checkRateLimit(key, config);
      expect(r1.allowed).toBe(true);

      const r2 = checkRateLimit(key, config);
      expect(r2.allowed).toBe(false);
    });
  });

  describe("Trusted Proxy IP Extraction", () => {
    it("should prioritize Cloudflare CF-Connecting-IP when TRUST_CF_CONNECTING_IP is enabled", () => {
      process.env.TRUST_CF_CONNECTING_IP = "true";
      const req = new Request("http://localhost/api/auth/login", {
        headers: {
          "cf-connecting-ip": "203.0.113.195",
          "x-real-ip": "198.51.100.22",
          "x-forwarded-for": "192.0.2.1, 198.51.100.22",
        },
      });

      expect(extractIp(req)).toBe("203.0.113.195");
    });

    it("should ignore untrusted CF-Connecting-IP and fall back to X-Real-IP when TRUST_CF_CONNECTING_IP is not enabled", () => {
      delete process.env.TRUST_CF_CONNECTING_IP;
      const req = new Request("http://localhost/api/auth/login", {
        headers: {
          "cf-connecting-ip": "203.0.113.195",
          "x-real-ip": "198.51.100.22",
          "x-forwarded-for": "192.0.2.1, 198.51.100.22",
        },
      });

      expect(extractIp(req)).toBe("198.51.100.22");
    });

    it("should prioritize Vercel Edge header x-vercel-forwarded-for over client-supplied headers", () => {
      const req = new Request("http://localhost/api/auth/login", {
        headers: {
          "x-vercel-forwarded-for": "203.0.113.50, 10.0.0.1",
          "cf-connecting-ip": "attacker-ip-1",
          "x-real-ip": "attacker-ip-2",
        },
      });

      expect(extractIp(req)).toBe("203.0.113.50");
    });

    it("should extract authentic rightmost client IP from X-Forwarded-For when attacker prepends spoofed IP", () => {
      // Attacker prepends '198.51.100.99' in an attempt to rotate IPs, but proxy appends authentic IP '203.0.113.55'
      const req = new Request("http://localhost/api/auth/login", {
        headers: {
          "x-forwarded-for": "198.51.100.99, 203.0.113.55",
        },
      });

      expect(extractIp(req)).toBe("203.0.113.55");
    });

    it("should extract single IP from X-Forwarded-For", () => {
      const req = new Request("http://localhost/api/auth/login", {
        headers: {
          "x-forwarded-for": "192.0.2.55",
        },
      });

      expect(extractIp(req)).toBe("192.0.2.55");
    });

    it("should fallback to unknown when no IP headers exist", () => {
      const req = new Request("http://localhost/api/auth/login");
      expect(extractIp(req)).toBe("unknown");
    });
  });

  describe("Redis Fallback Security Alert", () => {
    it("logs a HIGH severity warning when Redis client is disconnected and fallback activates", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const { RedisRateLimiterAdapter } = require("../security/rate-limit-redis");
      const limiter = new RedisRateLimiterAdapter(null);

      const result = await limiter.evaluate("test-key", { windowMs: 60_000, maxRequests: 5 });
      expect(result.allowed).toBe(true);
      expect(limiter.isUsingFallback()).toBe(true);

      expect(warnSpy).toHaveBeenCalled();
      const logged = JSON.parse(warnSpy.mock.calls[0][0]);
      expect(logged.event).toBe("rate_limit_redis_fallback_activated");
      expect(logged.severity).toBe("HIGH");

      warnSpy.mockRestore();
    });
  });
});
