/**
 * Unit Tests for withRateLimit Middleware Decorator
 * Sprint-038 / AGS-004
 */

import { withRateLimit, extractClientIp } from "../../security/rate-limit-middleware";
import { AdaptiveRateLimiter } from "../../security/adaptive-limiter";
import { NextResponse } from "next/server";

describe("withRateLimit Middleware (AGS-004)", () => {
  beforeEach(() => {
    AdaptiveRateLimiter.getInstance().reset();
    delete process.env.RATE_LIMIT_ENFORCEMENT_ENABLED;
  });

  it("should correctly extract client IP from CF and XFF headers", () => {
    const reqWithCf = new Request("http://localhost/api/test", {
      headers: { "cf-connecting-ip": "203.0.113.195" },
    });
    expect(extractClientIp(reqWithCf)).toBe("203.0.113.195");

    const reqWithXff = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.1" },
    });
    expect(extractClientIp(reqWithXff)).toBe("198.51.100.1");

    const reqPlain = new Request("http://localhost/api/test");
    expect(extractClientIp(reqPlain)).toBe("127.0.0.1");
  });

  it("should pass request and attach RFC 6585 rate limit headers on success", async () => {
    const mockHandler = jest.fn().mockImplementation(async () => {
      return NextResponse.json({ success: true }, { status: 200 });
    });

    const protectedHandler = withRateLimit(mockHandler, { tier: "query" });
    const req = new Request("http://localhost/api/data", {
      headers: { "x-forwarded-for": "192.168.1.50" },
    });

    const res = await protectedHandler(req);
    expect(res.status).toBe(200);
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(res.headers.get("ratelimit-limit")).toBeDefined();
    expect(res.headers.get("ratelimit-remaining")).toBeDefined();
    expect(res.headers.get("ratelimit-reset")).toBeDefined();
  });

  it("should return RFC 7807 429 Problem Details when rate limit is exceeded", async () => {
    const mockHandler = jest.fn().mockImplementation(async () => {
      return NextResponse.json({ success: true });
    });

    const protectedHandler = withRateLimit(mockHandler, { tier: "auth" });
    const req = new Request("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "192.168.1.99" },
    });

    // Exhaust quota
    for (let i = 0; i < 7; i++) {
      await protectedHandler(req);
    }

    const blockedRes = await protectedHandler(req);
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get("retry-after")).toBeDefined();

    const body = await blockedRes.json();
    expect(body.status).toBe(429);
    expect(body.title).toBe("Too Many Requests");
    expect(body.type).toBe("https://thaibahive.internal/errors/rate-limit-exceeded");
  });

  it("should bypass rate limiting when RATE_LIMIT_ENFORCEMENT_ENABLED is false", async () => {
    process.env.RATE_LIMIT_ENFORCEMENT_ENABLED = "false";
    const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const protectedHandler = withRateLimit(mockHandler, { tier: "auth" });

    const req = new Request("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "192.168.1.200" },
    });

    for (let i = 0; i < 20; i++) {
      const res = await protectedHandler(req);
      expect(res.status).toBe(200);
    }
  });
});
