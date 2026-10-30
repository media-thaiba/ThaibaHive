/** @jest-environment node */
import { POST } from "../route";
import { db } from "@/db";
import { staff, usedNonces, userSessions } from "@/db/schema";
import { verifyRefreshToken, createSessionWithRefresh } from "@thaiba/auth";
import { checkDistributedRateLimit } from "@/lib/api/rate-limit";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        run: jest.fn().mockResolvedValue({}),
      }),
    }),
  },
}));

jest.mock("@thaiba/auth", () => ({
  verifyRefreshToken: jest.fn(),
  createSessionWithRefresh: jest.fn(),
}));

jest.mock("@/lib/api/rate-limit", () => ({
  checkDistributedRateLimit: jest.fn(),
  extractIp: jest.fn(() => "127.0.0.1"),
  rateLimitResponse: jest.fn(() => new Response("rate limited", { status: 429 })),
}));

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
  });

  function mockDbSelectSequence(staffRow: any, sessionRow: any) {
    (db.select as jest.Mock).mockImplementation(() => {
      const chain: any = {
        from: jest.fn().mockImplementation((table: any) => ({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockImplementation(async () => {
              if (table === usedNonces) return null;
              if (table === staff) return staffRow;
              return sessionRow;
            }),
          }),
        })),
      };
      return chain;
    });

    const updateChain: any = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnValue({
        run: jest.fn().mockResolvedValue({}),
      }),
    };
    (db.update as jest.Mock).mockReturnValue(updateChain);
  }

  it("should return 400 when refreshToken is missing", async () => {
    const req = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Refresh token is required");
  });

  it("should return 401 when refreshToken is invalid or expired", async () => {
    (verifyRefreshToken as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "invalid_jwt" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid or expired refresh token");
  });

  it("should return 401 when staff member is inactive or not found", async () => {
    (verifyRefreshToken as jest.Mock).mockResolvedValue({
      sid: "sess_123",
      staffId: "staff_1",
      tokenVersion: 1,
    });
    mockDbSelectSequence(null, null);

    const req = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "valid_jwt" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Account inactive or not found");
  });

  it("should successfully renew tokens and slide session expiry", async () => {
    (verifyRefreshToken as jest.Mock).mockResolvedValue({
      sid: "sess_123",
      staffId: "staff_1",
      tokenVersion: 0,
    });

    const staffRow = {
      id: "staff_1",
      email: "user@thaiba.com",
      role: "admin",
      employeeId: "EMP-001",
      firstName: "Test",
      lastName: "User",
      isActive: true,
      tokenVersion: 0,
    };

    const sessionRow = {
      id: "sess_123",
      staffId: "staff_1",
      status: "active",
      expiresAt: Date.now() + 100000,
      deviceType: "mobile",
      institutionId: "inst_1",
    };

    mockDbSelectSequence(staffRow, sessionRow);

    (createSessionWithRefresh as jest.Mock).mockResolvedValue({
      token: "new_access_token_jwt",
      refreshToken: "new_refresh_token_jwt",
      sid: "sess_123",
      expiresAtMs: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    const req = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Platform": "mobile",
      },
      body: JSON.stringify({ refreshToken: "valid_jwt" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe("new_access_token_jwt");
    expect(body.refreshToken).toBe("new_refresh_token_jwt");
    expect(body.user.email).toBe("user@thaiba.com");
  });
});
