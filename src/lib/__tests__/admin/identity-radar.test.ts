import { GET } from "@/app/api/admin/security/identity/metrics/route";

jest.mock("@/lib/identity/revocation-store", () => ({
  revocationStore: {
    getStats: jest.fn().mockReturnValue({ revokedCount: 3, bloomSizeBytes: 108 }),
    getRecentRecords: jest.fn().mockReturnValue([
      { sessionId: "s1", userId: "u1", reason: "test", revokedAt: new Date().toISOString() },
    ]),
  },
}));

jest.mock("@/lib/api/auth-guard", () => ({
  requireAuth: (handler: (req: Request, session: unknown) => unknown) =>
    (req: Request) => handler(req, { staffId: "staff_admin_01", role: "super_admin" }),
}));

describe("GET /api/admin/security/identity/metrics", () => {
  it("returns identity metrics JSON with required fields", async () => {
    const req = new Request("http://localhost/api/admin/security/identity/metrics");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("sessionDistribution");
    expect(data).toHaveProperty("deviceTrustScores");
    expect(data).toHaveProperty("recentRiskEvents");
    expect(data).toHaveProperty("revocationVelocity");
    expect(data).toHaveProperty("migrationProgress");
    expect(data).toHaveProperty("revocationStats");
  });

  it("revocationStats reflects store state", async () => {
    const req = new Request("http://localhost/api/admin/security/identity/metrics");
    const res = await GET(req);
    const data = await res.json();
    expect(data.revocationStats.revokedCount).toBe(3);
    expect(data.revocationStats.bloomSizeBytes).toBe(108);
  });
});
