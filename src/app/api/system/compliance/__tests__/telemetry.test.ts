import { GET as getTelemetry } from "../telemetry/route";
import { GET as getViolations } from "../violations/route";
import { PATCH as patchViolation } from "../violations/[id]/route";

jest.mock("@/lib/auth/require-auth", () => ({
  requireAuth: (fn: any) => fn,
}));

jest.mock("@/db", () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
          limit: jest.fn().mockResolvedValue([
            {
              id: "vio-1",
              status: "OPEN",
              resolutionNotes: null,
            },
          ]),
        }),
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({}),
      }),
    }),
  },
}));

describe("Compliance Telemetry and Violations APIs", () => {
  it("GET /api/system/compliance/telemetry returns summary", async () => {
    const req = new Request("http://localhost:3000/api/system/compliance/telemetry");
    const res = await getTelemetry(req, { role: "admin" });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBeDefined();
    expect(json.overallScore).toBeDefined();
    expect(json.activeRulesCount).toBeGreaterThan(0);
  });

  it("GET /api/system/compliance/violations returns list", async () => {
    const req = new Request("http://localhost:3000/api/system/compliance/violations");
    const res = await getViolations(req, { role: "admin" });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.violations)).toBe(true);
  });

  it("PATCH /api/system/compliance/violations/[id] updates status", async () => {
    const req = new Request("http://localhost:3000/api/system/compliance/violations/vio-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED", resolutionNotes: "Verified approved emergency grant" }),
    });

    const res = await (patchViolation as any)(req, { role: "admin", userId: "admin-1" }, { params: { id: "vio-1" } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
