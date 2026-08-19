import { GET, POST } from "../drill/route";

jest.mock("@thaiba/auth", () => ({
  verifySession: jest.fn(),
}));

describe("API /api/system/dr/drill", () => {
  const { verifySession } = require("@thaiba/auth");

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DR_DRILL_SECRET;
  });

  describe("GET", () => {
    test("rejects unauthenticated requests with 401", async () => {
      verifySession.mockResolvedValue(null);
      const req = new Request("http://localhost/api/system/dr/drill");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    test("rejects non-admin role with 403", async () => {
      verifySession.mockResolvedValue({ role: "staff", id: "staff-1" });
      const req = new Request("http://localhost/api/system/dr/drill");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    test("returns drill status and history for super_admin session", async () => {
      verifySession.mockResolvedValue({ role: "super_admin", id: "admin-1" });
      const req = new Request("http://localhost/api/system/dr/drill");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.current).toBeDefined();
      expect(Array.isArray(body.history)).toBe(true);
    });

    test("accepts valid x-dr-secret header", async () => {
      process.env.DR_DRILL_SECRET = "test-dr-secret-key";
      verifySession.mockResolvedValue(null);
      const req = new Request("http://localhost/api/system/dr/drill", {
        headers: { "x-dr-secret": "test-dr-secret-key" },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  describe("POST", () => {
    test("rejects non-super_admin with 403", async () => {
      verifySession.mockResolvedValue({ role: "admin", id: "admin-1" });
      const req = new Request("http://localhost/api/system/dr/drill", {
        method: "POST",
        body: JSON.stringify({ action: "start", scenario: "PRIMARY_OUTAGE" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    test("rejects invalid scenario with 400", async () => {
      verifySession.mockResolvedValue({ role: "super_admin", id: "admin-1" });
      const req = new Request("http://localhost/api/system/dr/drill", {
        method: "POST",
        body: JSON.stringify({ action: "start", scenario: "INVALID_SCENARIO" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    test("executes drill start successfully for valid scenario", async () => {
      verifySession.mockResolvedValue({ role: "super_admin", id: "admin-1" });
      const req = new Request("http://localhost/api/system/dr/drill", {
        method: "POST",
        body: JSON.stringify({ action: "start", scenario: "PRIMARY_OUTAGE" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.scenario).toBe("PRIMARY_OUTAGE");
    });

    test("aborts running drill successfully", async () => {
      verifySession.mockResolvedValue({ role: "super_admin", id: "admin-1" });
      const req = new Request("http://localhost/api/system/dr/drill", {
        method: "POST",
        body: JSON.stringify({ action: "abort" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
