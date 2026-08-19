import { GET } from "../route";

jest.mock("@thaiba/auth", () => ({
  verifySession: jest.fn(),
}));

describe("GET /api/system/cache-sync-status", () => {
  const { verifySession } = require("@thaiba/auth");

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CACHE_SYNC_SECRET;
  });

  test("rejects unauthenticated requests with 401", async () => {
    verifySession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/system/cache-sync-status");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  test("rejects non-admin role with 403", async () => {
    verifySession.mockResolvedValue({ role: "staff", id: "staff-1" });
    const req = new Request("http://localhost/api/system/cache-sync-status");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  test("returns cache mesh health report for super_admin session", async () => {
    verifySession.mockResolvedValue({ role: "super_admin", id: "admin-1" });
    const req = new Request("http://localhost/api/system/cache-sync-status");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meshStatus).toBeDefined();
    expect(body.nodes.length).toBeGreaterThan(0);
  });

  test("accepts valid x-cache-secret header", async () => {
    process.env.CACHE_SYNC_SECRET = "test-cache-secret";
    verifySession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/system/cache-sync-status", {
      headers: { "x-cache-secret": "test-cache-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
