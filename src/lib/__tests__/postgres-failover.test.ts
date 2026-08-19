import { PostgresClusterMonitor } from "../database/cluster-monitor";
import { PostgresFailoverManager } from "../database/failover-manager";
import { DynamicReplicaPool } from "../database/replica-pool";
import { ZeroDowntimeLiveMigrator } from "../database/live-migrator";
import { PostgresClusterNode } from "../database/types";

function buildTestCluster(primaryHealthy = true): PostgresClusterMonitor {
  const nodes: PostgresClusterNode[] = [
    {
      nodeId: "node-1-primary",
      role: "PRIMARY",
      endpoint: "postgresql://db1.test:5432",
      isHealthy: primaryHealthy,
      replicationLagBytes: 0,
      replicationLagMs: 0,
      lastCheckedAt: Date.now(),
    },
    {
      nodeId: "node-2-standby",
      role: "STANDBY",
      endpoint: "postgresql://db2.test:5432",
      isHealthy: true,
      replicationLagBytes: 256,
      replicationLagMs: 8,
      lastCheckedAt: Date.now(),
    },
    {
      nodeId: "node-3-replica",
      role: "READ_REPLICA",
      endpoint: "postgresql://db3.test:5432",
      isHealthy: true,
      replicationLagBytes: 1024,
      replicationLagMs: 35,
      lastCheckedAt: Date.now(),
    },
  ];
  const monitor = new PostgresClusterMonitor(nodes);
  return monitor;
}

describe("PostgreSQL Cluster Failover & Migration Test Suite", () => {
  describe("GEI-015: Cluster Monitor & Replica Pool", () => {
    it("should evaluate cluster health and identify primary node", () => {
      const monitor = buildTestCluster(true);
      const report = monitor.evaluateClusterHealth();

      expect(report.primaryNodeId).toBe("node-1-primary");
      expect(report.totalNodes).toBe(3);
      expect(report.healthyNodesCount).toBe(3);
      expect(report.isQuorumHealthy).toBe(true);
      expect(report.maxReplicationLagMs).toBe(35);
    });

    it("should route read queries to lowest-lag replica excluding primary", () => {
      const monitor = buildTestCluster(true);
      const pool = new DynamicReplicaPool(monitor);

      const endpoint = pool.getReadReplicaEndpoint(2000);
      expect(endpoint).toContain("db2.test"); // node-2-standby has lowest lag (8ms)
    });

    it("should fallback READ queries to primary when all replicas exceed lag threshold", () => {
      const nodes: PostgresClusterNode[] = [
        { nodeId: "node-1-primary", role: "PRIMARY", endpoint: "postgresql://db1.test:5432", isHealthy: true, replicationLagBytes: 0, replicationLagMs: 0, lastCheckedAt: Date.now() },
        { nodeId: "node-2-standby", role: "STANDBY", endpoint: "postgresql://db2.test:5432", isHealthy: true, replicationLagBytes: 99999, replicationLagMs: 5000, lastCheckedAt: Date.now() },
      ];
      const monitor = new PostgresClusterMonitor(nodes);
      const pool = new DynamicReplicaPool(monitor);

      // All replicas exceed 2s lag; should fallback to primary
      const endpoint = pool.getReadReplicaEndpoint(2000);
      expect(endpoint).toContain("db1.test");
    });
  });

  describe("GEI-016: Automated Failover Manager", () => {
    it("should promote standby node to PRIMARY within <30 seconds when primary fails", async () => {
      const monitor = buildTestCluster(false); // primary unhealthy
      const failoverManager = new PostgresFailoverManager(monitor);

      const startTime = Date.now();
      const result = await failoverManager.executeAutomatedFailover("node-1-primary");
      const elapsed = Date.now() - startTime;

      expect(result.status).toBe("SUCCESS");
      expect(result.promotedNodeId).toBe("node-2-standby"); // Lowest lag candidate
      expect(result.newPrimaryEndpoint).toContain("db2.test");
      expect(elapsed).toBeLessThan(30000); // <30 seconds SLA
    });

    it("should abort failover when quorum is not healthy (split-brain guard)", async () => {
      const nodes: PostgresClusterNode[] = [
        { nodeId: "node-1-primary", role: "PRIMARY", endpoint: "postgresql://db1.test:5432", isHealthy: false, replicationLagBytes: 0, replicationLagMs: 0, lastCheckedAt: Date.now() },
        { nodeId: "node-2-standby", role: "STANDBY", endpoint: "postgresql://db2.test:5432", isHealthy: false, replicationLagBytes: 512, replicationLagMs: 10, lastCheckedAt: Date.now() },
        { nodeId: "node-3-replica", role: "READ_REPLICA", endpoint: "postgresql://db3.test:5432", isHealthy: false, replicationLagBytes: 1024, replicationLagMs: 40, lastCheckedAt: Date.now() },
      ];
      const monitor = new PostgresClusterMonitor(nodes);
      const failoverManager = new PostgresFailoverManager(monitor);

      const result = await failoverManager.executeAutomatedFailover("node-1-primary");
      expect(result.status).toBe("FAILED");
      expect(result.message).toContain("quorum");
    });

    it("should abort failover when no standby node is within lag SLA", async () => {
      const nodes: PostgresClusterNode[] = [
        { nodeId: "node-1-primary", role: "PRIMARY", endpoint: "postgresql://db1.test:5432", isHealthy: false, replicationLagBytes: 0, replicationLagMs: 0, lastCheckedAt: Date.now() },
        { nodeId: "node-2-standby", role: "STANDBY", endpoint: "postgresql://db2.test:5432", isHealthy: true, replicationLagBytes: 999999, replicationLagMs: 8000, lastCheckedAt: Date.now() },
        { nodeId: "node-3-replica", role: "READ_REPLICA", endpoint: "postgresql://db3.test:5432", isHealthy: true, replicationLagBytes: 999999, replicationLagMs: 8000, lastCheckedAt: Date.now() },
      ];
      const monitor = new PostgresClusterMonitor(nodes);
      const failoverManager = new PostgresFailoverManager(monitor);

      const result = await failoverManager.executeAutomatedFailover("node-1-primary");
      expect(result.status).toBe("FAILED");
      expect(result.message).toContain("replication lag SLA");
    });
  });

  describe("GEI-016: Zero-Downtime Live Migrator", () => {
    it("should complete a zero-downtime migration through full lifecycle (PENDING -> COMPLETED)", () => {
      const migrator = new ZeroDowntimeLiveMigrator();
      let job = migrator.startMigration("mig-001", "inst-001", "add_vector_clock_idx");
      expect(job.status).toBe("PENDING");

      job = migrator.advanceToDualWrite("mig-001");
      expect(job.status).toBe("DUAL_WRITING");

      job = migrator.validateAndCutover("mig-001");
      expect(job.status).toBe("COMPLETED");
      expect(job.completedAt).toBeDefined();
    });

    it("should rollback migration cleanly and record reason", () => {
      const migrator = new ZeroDowntimeLiveMigrator();
      migrator.startMigration("mig-002", "inst-001", "risky_migration");
      migrator.advanceToDualWrite("mig-002");

      const rolled = migrator.rollbackMigration("mig-002", "Validation checksum mismatch");
      expect(rolled.status).toBe("ROLLED_BACK");
      expect(rolled.error).toContain("checksum mismatch");
    });
  });
});
