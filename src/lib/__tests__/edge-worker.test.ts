import { handleEdgeRequest } from "../edge/worker";
import { parseTenantContext } from "../edge/tenant-context";
import { checkRateLimit, clearRateLimitCache } from "../edge/rate-limiter";
import { webFetchAdapter } from "../edge/adapter";
import { SignJWT, jwtVerify } from "jose";

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
  SignJWT: jest.fn().mockImplementation((payload) => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockImplementation(async (sec) => {
      // Simulate signature failure for wrong secret
      if (sec && sec[0] === 117) { // "u" from untrusted
        return "invalid-secret-token";
      }
      return `mocked-jwt:${JSON.stringify(payload)}`;
    }),
  })),
}));

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key-123456");

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Phase 1: Edge Infrastructure & Deployments Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRateLimitCache();
    mockFetch.mockReset();

    (jwtVerify as jest.Mock).mockImplementation(async (token, sec) => {
      if (token === "invalid-secret-token" || (sec && sec[0] === 117)) {
        throw new Error("signature verification failed");
      }
      if (token.startsWith("mocked-jwt:")) {
        const payloadStr = token.substring(11);
        return { payload: JSON.parse(payloadStr) };
      }
      throw new Error("invalid token");
    });
  });

  describe("Tenant Context JWT Parser", () => {
    it("should successfully verify and parse a valid signed JWT", async () => {
      const token = await new SignJWT({
        tenantId: "tenant_abc",
        userId: "usr_123",
        role: "admin",
        permissions: ["academics:read"],
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("2h")
        .sign(secret);

      const context = await parseTenantContext(token);
      expect(context.tenantId).toBe("tenant_abc");
      expect(context.userId).toBe("usr_123");
      expect(context.role).toBe("admin");
      expect(context.permissions).toContain("academics:read");
    });

    it("should throw an error for expired or tampered JWT", async () => {
      const wrongSecret = new TextEncoder().encode("untrusted-signature-key-123456");
      const tamperedToken = await new SignJWT({
        tenantId: "tenant_abc",
        userId: "usr_123",
      })
        .setProtectedHeader({ alg: "HS256" })
        .sign(wrongSecret);

      await expect(parseTenantContext(tamperedToken)).rejects.toThrow("JWT Verification Failed");
    });
  });

  describe("Token-Bucket Rate Limiter", () => {
    it("should allow requests under the limit and then restrict them once bucket is empty", async () => {
      // 3 requests allowed, window of 60s
      const key = "test_user_rate";
      const limit = 3;

      const res1 = await checkRateLimit(key, limit);
      const res2 = await checkRateLimit(key, limit);
      const res3 = await checkRateLimit(key, limit);
      const res4 = await checkRateLimit(key, limit);

      expect(res1.allowed).toBe(true);
      expect(res2.allowed).toBe(true);
      expect(res3.allowed).toBe(true);
      expect(res4.allowed).toBe(false);
      expect(res4.remaining).toBe(0);
    });
  });

  describe("Edge Worker Core Handler", () => {
    it("should process requests and forward them to origin when cache misses", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        text: async () => JSON.stringify({ data: "origin response" }),
        headers: new Headers({ "Content-Type": "application/json" }),
      });

      const req = {
        url: "http://localhost:3000/api/academics/grades",
        method: "GET",
        headers: { "Content-Type": "application/json" },
      };

      const ctx = {
        region: "EU",
        clientIp: "8.8.8.8",
        timestamp: Date.now(),
      };

      const res = await handleEdgeRequest(req, ctx);

      expect(res.status).toBe(200);
      expect(res.headers["X-Edge-Cache"]).toBe("MISS");
      expect(res.headers["X-Edge-Region"]).toBe("EU");
      expect(mockFetch).toHaveBeenCalledWith(req.url, expect.any(Object));
    });

    it("should enforce rate limiting and return 429 when threshold exceeded", async () => {
      const ip = "1.2.3.4";
      const req = {
        url: "http://localhost:3000/api/unrestricted",
        method: "GET",
        headers: {},
      };

      const ctx = {
        region: "US",
        clientIp: ip,
        timestamp: Date.now(),
      };

      // Exhaust limit of 20 (anonymous limit)
      for (let i = 0; i < 20; i++) {
        await handleEdgeRequest(req, ctx);
      }

      const rateLimitedRes = await handleEdgeRequest(req, ctx);
      expect(rateLimitedRes.status).toBe(429);
      expect(JSON.parse(rateLimitedRes.body)).toEqual({
        error: "Too many requests. Please try again later.",
      });
    });
  });

  describe("Web Fetch Adapter", () => {
    it("should map web Request to EdgeRequest and back to Response", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        text: async () => "Hello from Origin",
        headers: new Headers({ "content-type": "text/plain" }),
      });

      const webRequest = new Request("http://localhost:3000/api/any", {
        method: "GET",
        headers: new Headers({ "x-custom-test": "adapter" }),
      });

      const webResponse = await webFetchAdapter(webRequest);
      expect(webResponse.status).toBe(200);
      expect(webResponse.headers.get("X-Edge-Cache")).toBe("MISS");
      const text = await webResponse.text();
      expect(text).toBe("Hello from Origin");
    });
  });
});
