import { GET } from "../audit-logs/route";
import { db } from "@/db";

jest.mock("@/lib/auth/require-auth", () => ({
  requireAuth: (handler: any) => (req: any, session: any) => handler(req, session || { role: "super_admin" }),
}));

jest.mock("@/db", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    all: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue({ count: 0 }),
  },
}));

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
    const session = { role: "super_admin" };

    const mockLogs = [
      { id: "log-1", timestamp: "2026-08-06T12:00:00Z", userId: "user_01", preferenceKey: "theme", oldValue: "light", newValue: "dark", ipAddress: "127.0.0.1", institutionId: "inst_1" }
    ];
    (db.all as jest.Mock).mockResolvedValueOnce(mockLogs);
    (db.get as jest.Mock).mockResolvedValueOnce({ count: 1 });

    const res = await (GET as any)(req, session);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.logs).toHaveLength(1);
    expect(data.pagination.total).toBe(1);
  });

  it("returns Forbidden for unauthorized access", async () => {
    const req = createMockRequest("http://localhost/api/admin/audit-logs");
    const session = { role: "staff" };

    const res = await (GET as any)(req, session);
    expect(res.status).toBe(403);
  });
});
