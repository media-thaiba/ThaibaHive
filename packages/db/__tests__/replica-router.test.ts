import { ReplicaQueryRouter } from "../replica-router";

describe("ReplicaQueryRouter", () => {
  let mockPrimary: any;
  let mockReplica1: any;
  let mockReplica2: any;
  let router: ReplicaQueryRouter;

  beforeEach(() => {
    mockPrimary = { name: "primary-db", run: jest.fn(), all: jest.fn() };
    mockReplica1 = { name: "replica-1", run: jest.fn(), all: jest.fn() };
    mockReplica2 = { name: "replica-2", run: jest.fn(), all: jest.fn() };

    router = new ReplicaQueryRouter(
      mockPrimary,
      [mockReplica1, mockReplica2],
      {
        primaryUrl: "postgres://primary",
        replicaUrls: ["postgres://rep1", "postgres://rep2"],
        enabled: true,
        sessionStickinessTtlMs: 500,
      }
    );
  });

  test("routes getWriteDb strictly to primary and records session write", () => {
    const writeDb = router.getWriteDb("session-123");
    expect(writeDb).toBe(mockPrimary);
    expect(router.isSessionPinnedToPrimary("session-123")).toBe(true);
  });

  test("routes getReadDb to replicas round-robin when healthy", () => {
    const db1 = router.getReadDb();
    const db2 = router.getReadDb();
    const db3 = router.getReadDb();

    expect(db1).toBe(mockReplica1);
    expect(db2).toBe(mockReplica2);
    expect(db3).toBe(mockReplica1);
  });

  test("routes getReadDb to primary if session has recent write (Read-Your-Own-Writes)", () => {
    router.recordWrite("session-user-1");
    expect(router.isSessionPinnedToPrimary("session-user-1")).toBe(true);

    const readDb = router.getReadDb("session-user-1");
    expect(readDb).toBe(mockPrimary);

    // Other sessions still route to replicas
    const otherReadDb = router.getReadDb("session-user-2");
    expect(otherReadDb).toBe(mockReplica1);
  });

  test("falls back to primary when replicas are disabled", () => {
    router.setEnabled(false);
    expect(router.isEnabled()).toBe(false);

    const readDb = router.getReadDb();
    expect(readDb).toBe(mockPrimary);
  });

  test("bypasses unhealthy replicas with lag > threshold", () => {
    router.markReplicaHealth(0, false, 8000); // Replica 1 is degraded
    expect(router.getReplicaStatuses()[0].isHealthy).toBe(false);

    const db1 = router.getReadDb();
    const db2 = router.getReadDb();

    // Both queries route to replica 2 since replica 1 is unhealthy
    expect(db1).toBe(mockReplica2);
    expect(db2).toBe(mockReplica2);
  });

  test("falls back to primary if all replicas are unhealthy", () => {
    router.markReplicaHealth(0, false, 9000);
    router.markReplicaHealth(1, false, 9000);

    const readDb = router.getReadDb();
    expect(readDb).toBe(mockPrimary);
  });
});
