import { GET } from "../route";

jest.mock("@thaiba/auth", () => ({
  verifySession: jest.fn(),
}));

jest.mock("@/lib/db/replica-health", () => ({
  ReplicaHealthTracker: {
    getInstance: () => ({
      checkClusterHealth: jest.fn().mockResolvedValue({
        timestamp: "2026-08-19T12:00:00.000Z",
        clusterStatus: "healthy",
        primaryHealthy: true,
        totalReplicas: 2,
        healthyReplicas: 2,
        replicas: [
          { id: "replica-1", url: "postgres://rep1", isHealthy: true, lagMs: 12, lastCheckedAt: "2026-08-19T12:00:00.000Z", totalQueriesRouted: 100 },
          { id: "replica-2", url: "postgres://rep2", isHealthy: true, lagMs: 15, lastCheckedAt: "2026-08-19T12:00:00.000Z", totalQueriesRouted: 95 },
        ],
        lagThresholdMs: 5000,
      }),
    }),
  },
}));

describe("GET /api/system/replica-status", () => {
  const { verifySession } = require("@thaiba/auth");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects unauthenticated requests without session or secret with 401", async () => {
    verifySession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/system/replica-status");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  test("rejects non-admin role with 403", async () => {
    verifySession.mockResolvedValue({ role: "staff", id: "staff-1" });
    const req = new Request("http://localhost/api/system/replica-status");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  test("returns replica health report for super_admin session", async () => {
    verifySession.mockResolvedValue({ role: "super_admin", id: "admin-1" });
    const req = new Request("http://localhost/api/system/replica-status");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clusterStatus).toBe("healthy");
    expect(body.totalReplicas).toBe(2);
  });

  test("accepts valid x-replica-secret header", async () => {
    process.env.REPLICA_SECRET = "super-secret-replica-key";
    const req = new Request("http://localhost/api/system/replica-status", {
      headers: { "x-replica-secret": "super-secret-replica-key" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clusterStatus).toBe("healthy");
  });
});
