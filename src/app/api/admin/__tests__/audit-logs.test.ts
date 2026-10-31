import { GET } from "../audit-logs/route";
import { db } from "@/db";

jest.mock("@/lib/auth/require-auth", () => ({
  requireAuth: (handler: any) => (req: any, session: any) => handler(req, session || { role: "super_admin", staffId: "staff_super" }),
}));

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    resolveRequestInstitution: jest.fn().mockImplementation(async (_session, reqInst) => reqInst || "inst_scoped_fallback"),
    isGlobalScopeRole: jest.fn().mockImplementation((role) => role === "super_admin"),
  };
});

jest.mock("@/db", () => {
  const mockWhere = jest.fn().mockReturnThis();
  return {
    db: {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: mockWhere,
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      all: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
});

function createMockRequest(url: string, method: string = "GET"): Request {
  return new Request(url, {
    method,
    headers: new Headers({
      "Content-Type": "application/json",
    }),
  });
}

describe("AUD-001: Preference Audit Logs API Endpoint Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retrieves preference audit logs via GET", async () => {
    const req = createMockRequest("http://localhost/api/admin/audit-logs?page=1&limit=20&userId=user_01");
    const session = { role: "super_admin", staffId: "staff_super" };

    const mockLogs = [
      { id: "log-1", timestamp: "2026-08-06T12:00:00Z", userId: "user_01", preferenceKey: "theme", oldValue: "light", newValue: "dark", ipAddress: "127.0.0.1", institutionId: "inst_1" }
    ];
    ((db as any).all as jest.Mock).mockResolvedValueOnce(mockLogs);
    ((db as any).get as jest.Mock).mockResolvedValueOnce({ count: 1 });

    const res = await (GET as any)(req, session);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.logs).toHaveLength(1);
    expect(data.pagination.total).toBe(1);
  });

  it("global super_admin without institutionId parameter queries across all tenants", async () => {
    const req = createMockRequest("http://localhost/api/admin/audit-logs?page=1&limit=20");
    const session = { role: "super_admin", staffId: "staff_super" };

    ((db as any).all as jest.Mock).mockResolvedValueOnce([]);
    ((db as any).get as jest.Mock).mockResolvedValueOnce({ count: 0 });

    const res = await (GET as any)(req, session);
    expect(res.status).toBe(200);
    // where clause should be undefined when no filters are passed for global role
    expect((db as any).where).toHaveBeenCalledWith(undefined);
  });

  it("scoped query with institutionId resolves requested institution", async () => {
    const req = createMockRequest("http://localhost/api/admin/audit-logs?page=1&limit=20&institutionId=inst_target");
    const session = { role: "super_admin", staffId: "staff_super" };

    ((db as any).all as jest.Mock).mockResolvedValueOnce([]);
    ((db as any).get as jest.Mock).mockResolvedValueOnce({ count: 0 });

    const res = await (GET as any)(req, session);
    expect(res.status).toBe(200);
    expect((db as any).where).toHaveBeenCalledWith(expect.anything());
  });

  it("returns Forbidden for unauthorized access", async () => {
    const req = createMockRequest("http://localhost/api/admin/audit-logs");
    const session = { role: "staff", staffId: "staff_regular" };

    const res = await (GET as any)(req, session);
    expect(res.status).toBe(403);
  });
});
