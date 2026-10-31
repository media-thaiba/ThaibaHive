import { GET } from "@/app/api/admin/security/identity/metrics/route";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              all: jest.fn().mockReturnValue([
                {
                  id: "a1",
                  userId: "u1",
                  payload: { targetStaffId: "u1", reason: "test" },
                  timestamp: new Date().toISOString(),
                },
              ]),
            }),
          }),
        }),
        all: jest.fn().mockReturnValue([]),
      }),
    }),
  },
}));

jest.mock("@/lib/identity/migration-layer", () => ({
  getMigrationStats: jest.fn().mockResolvedValue({
    total: 10,
    migrated: 8,
    legacy: 2,
    percentMigrated: 80,
  }),
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

  it("revocationStats reflects database audit state", async () => {
    const req = new Request("http://localhost/api/admin/security/identity/metrics");
    const res = await GET(req);
    const data = await res.json();
    expect(data.revocationStats.totalRevoked).toBe(1);
    expect(data.revocationStats.recentCount).toBe(1);
  });
});
