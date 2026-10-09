import { POST as handleHandoffPost, GET as handleHandoffGet } from "../route";
import { POST as handleNoncePost } from "../nonce/route";
import { createMobileNonce, verifyMobileNonce } from "@/lib/auth/mobile-nonce-service";
import { db } from "@/db";
import { createSession } from "@/lib/auth";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock("@/lib/auth", () => ({
  createSession: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("@/lib/api/rate-limit", () => ({
  checkDistributedRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 10, resetMs: 60000 }),
  extractIp: jest.fn().mockReturnValue("127.0.0.1"),
}));

describe("Mobile Auth Handoff Engine", () => {
  let mockUser: any = null;
  let mockUsedNonces: Set<string> = new Set();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsedNonces = new Set();
    mockUser = {
      id: "staff_123",
      email: "teacher@thaiba.edu",
      role: "staff",
      employeeId: "EMP-101",
      firstName: "Ahmed",
      lastName: "Ali",
      isActive: true,
      tokenVersion: 1,
    };

    (db.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn(async () => mockUser),
        }),
      }),
    });

    (db.insert as jest.Mock).mockReturnValue({
      values: jest.fn((val: { jti: string; expiresAt: string }) => ({
        run: jest.fn(() => {
          if (mockUsedNonces.has(val.jti)) {
            throw new Error("UNIQUE constraint failed: used_nonces.jti");
          }
          mockUsedNonces.add(val.jti);
          return { changes: 1 };
        }),
      })),
    });
  });

  describe("mobile-nonce-service", () => {
    it("mints an HMAC SHA-256 JWT verifiable by verifyMobileNonce", async () => {
      const { nonce, expiresAt, redirectUrl } = await createMobileNonce({
        staffId: "staff_123",
        email: "teacher@thaiba.edu",
        role: "staff",
        employeeId: "EMP-101",
        name: "Ahmed Ali",
        tokenVersion: 1,
        targetUrl: "/school/timetable",
        deviceId: "device_abc",
      });

      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe("string");
      expect(expiresAt).toBeDefined();
      expect(redirectUrl).toContain("/auth/mobile-handoff");
      expect(redirectUrl).toContain("redirect=%2Fschool%2Ftimetable");

      const payload = await verifyMobileNonce(nonce);
      expect(payload).not.toBeNull();
      expect(payload?.staffId).toBe("staff_123");
      expect(payload?.email).toBe("teacher@thaiba.edu");
      expect(payload?.targetUrl).toBe("/school/timetable");
      expect(payload?.jti).toBeDefined();
    });

    it("returns null on invalid or tampered nonce", async () => {
      const payload = await verifyMobileNonce("invalid.fake.token");
      expect(payload).toBeNull();
    });
  });

  describe("POST /api/auth/mobile-handoff", () => {
    it("exchanges valid Bearer nonce for session cookie and 302 redirect", async () => {
      const { nonce } = await createMobileNonce({
        staffId: "staff_123",
        email: "teacher@thaiba.edu",
        role: "staff",
        tokenVersion: 1,
        targetUrl: "/school/timetable",
      });

      const request = new Request("http://localhost:3000/api/auth/mobile-handoff?redirect=%2Fschool%2Ftimetable", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${nonce}`,
        },
      });

      const response = await handleHandoffPost(request);
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("http://localhost:3000/school/timetable");
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: "staff_123",
          email: "teacher@thaiba.edu",
          role: "staff",
        })
      );
    });

    it("supports GET with query parameter nonce", async () => {
      const { nonce } = await createMobileNonce({
        staffId: "staff_123",
        email: "teacher@thaiba.edu",
        role: "staff",
        tokenVersion: 1,
        targetUrl: "/operations/assets",
      });

      const request = new Request(`http://localhost:3000/api/auth/mobile-handoff?nonce=${encodeURIComponent(nonce)}&redirect=%2Foperations%2Fassets`, {
        method: "GET",
      });

      const response = await handleHandoffGet(request);
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("http://localhost:3000/operations/assets");
    });

    it("blocks nonce replay attempt with replay_detected error", async () => {
      const { nonce } = await createMobileNonce({
        staffId: "staff_123",
        email: "teacher@thaiba.edu",
        role: "staff",
        tokenVersion: 1,
        targetUrl: "/school/timetable",
      });

      const req1 = new Request("http://localhost:3000/api/auth/mobile-handoff", {
        method: "POST",
        headers: { Authorization: `Bearer ${nonce}` },
      });
      const res1 = await handleHandoffPost(req1);
      expect(res1.status).toBe(302);

      // Second replay attempt
      const req2 = new Request("http://localhost:3000/api/auth/mobile-handoff", {
        method: "POST",
        headers: { Authorization: `Bearer ${nonce}` },
      });
      const res2 = await handleHandoffPost(req2);
      expect(res2.status).toBe(302);
      expect(res2.headers.get("location")).toContain("code=replay_detected");
    });

    it("sanitizes open-redirect attempts to safe relative paths", async () => {
      const maliciousUrls = [
        "https://evil.com/phish",
        "//evil.com",
        "/\\evil.com",
        "javascript:alert(1)",
      ];

      for (const badUrl of maliciousUrls) {
        const { nonce: freshNonce } = await createMobileNonce({
          staffId: "staff_123",
          email: "teacher@thaiba.edu",
          role: "staff",
          tokenVersion: 1,
        });

        const req = new Request(`http://localhost:3000/api/auth/mobile-handoff?redirect=${encodeURIComponent(badUrl)}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${freshNonce}` },
        });

        const res = await handleHandoffPost(req);
        expect(res.status).toBe(302);
        const loc = res.headers.get("location") || "";
        expect(loc.startsWith("http://localhost:3000/")).toBe(true);
        expect(loc).not.toContain("evil.com");
      }
    });

    it("rejects handoff for deactivated users", async () => {
      mockUser.isActive = false;

      const { nonce } = await createMobileNonce({
        staffId: "staff_123",
        email: "teacher@thaiba.edu",
        role: "staff",
        tokenVersion: 1,
      });

      const req = new Request("http://localhost:3000/api/auth/mobile-handoff", {
        method: "POST",
        headers: { Authorization: `Bearer ${nonce}` },
      });

      const res = await handleHandoffPost(req);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toContain("code=account_deactivated");
    });
  });
});
