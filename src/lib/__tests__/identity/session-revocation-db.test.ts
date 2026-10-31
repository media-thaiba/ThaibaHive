/**
 * Tests for Database-Backed Session Revocation & Lifecycle
 * Covers ADR-0002 / Phase 1 Remediation
 */

import { POST as revokeHandler } from "@/app/api/auth/revoke/route";
import { db } from "@/db";

jest.mock("@/db", () => {
  return {
    db: {
      transaction: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
    },
  };
});

jest.mock("@/lib/audit/crypto-writer", () => ({
  cryptoAuditWriter: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/identity/dpop-middleware", () => ({
  withDPoP: (handler: any) => handler,
}));

jest.mock("@/lib/api/auth-guard", () => ({
  requireAuth: (handler: any) => (req: Request) => {
    // Default mock session as super_admin
    const mockSession = {
      staffId: "admin_123",
      sid: "session_admin_123",
      role: "super_admin",
      institutionId: "inst_main",
      tokenVersion: 1,
    };
    return handler(req, mockSession);
  },
}));

describe("POST /api/auth/revoke (DB-Backed)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/auth/revoke", {
      method: "POST",
      body: "invalid-json",
    });

    const res = await revokeHandler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid JSON");
  });

  it("returns 400 when required fields are missing", async () => {
    const req = new Request("http://localhost/api/auth/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user_1" }), // missing sessionId and reason
    });

    const res = await revokeHandler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("fails closed (returns 400) when target session is not found in transaction", async () => {
    const mockTx = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(null), // session not found
          }),
        }),
      }),
      update: jest.fn(),
    };

    (db.transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTx));

    const req = new Request("http://localhost/api/auth/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "target_user",
        sessionId: "nonexistent_session",
        reason: "Security audit",
      }),
    });

    const res = await revokeHandler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("not found");
  });

  it("fails closed (returns 400) when session is already terminated", async () => {
    const mockTx = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              id: "session_old",
              staffId: "target_user",
              status: "terminated",
            }),
          }),
        }),
      }),
      update: jest.fn(),
    };

    (db.transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTx));

    const req = new Request("http://localhost/api/auth/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "target_user",
        sessionId: "session_old",
        reason: "Security audit",
      }),
    });

    const res = await revokeHandler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("already terminated");
  });

  it("atomically bumps tokenVersion, terminates session, and records audit log", async () => {
    const mockRun = jest.fn();
    const mockWhere = jest.fn().mockReturnValue({ run: mockRun });
    const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
    const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });

    const mockTx = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              id: "active_session",
              staffId: "target_user",
              status: "active",
            }),
          }),
        }),
      }),
      update: mockUpdate,
    };

    (db.transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTx));

    const req = new Request("http://localhost/api/auth/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "target_user",
        sessionId: "active_session",
        reason: "Employee offboarding",
      }),
    });

    const res = await revokeHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.revoked).toBe(true);
    expect(body.sessionId).toBe("active_session");
    expect(body.userId).toBe("target_user");

    // Verified updates were executed inside tx
    expect(mockUpdate).toHaveBeenCalledTimes(2); // staff tokenVersion + userSessions status
  });
});
