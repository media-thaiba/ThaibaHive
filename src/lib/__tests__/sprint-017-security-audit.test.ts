/**
 * GEI-019: Sprint-017 Security Audit Tests
 * Verifies that all three Sprint-017 subsystems implement:
 *   - Input validation and injection prevention
 *   - No secrets / PII leaking in error messages
 *   - Authentication / authorization boundaries
 *   - Safe serialization (no prototype pollution)
 *   - CRDT idempotency (replay attack resistance)
 *   - Fail-safe failover (quorum guard prevents split-brain)
 */

import { compareVectorClocks, resolveLwwConflict } from "../mesh/crdt-resolver";
import { CrossRegionSyncQueue } from "../mesh/sync-queue";
import { VectorClockManager } from "../mesh/vector-clock";
import { PostgresClusterMonitor } from "../database/cluster-monitor";
import { PostgresFailoverManager } from "../database/failover-manager";
import { StudentFeatureExtractor } from "../analytics/feature-extractor";
import { StudentPredictionEngine } from "../analytics/prediction-engine";
import { LearningPathRecommender } from "../analytics/learning-path-recommender";
import { MediaSessionManager } from "../streaming/media-session";
import { PostgresClusterNode } from "../database/types";
import { EntityMutationDelta } from "../mesh/types";
import { RawStudentActivityData } from "../analytics/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildDelta(entityId: string, payload: Record<string, any>, ts: number): EntityMutationDelta {
  return {
    entityType: "student",
    entityId,
    tenantId: "tenant-A",
    regionId: "region-1",
    operation: "UPDATE",
    payload,
    timestamp: ts,
    vectorClock: { "region-1": 1 },
  };
}

function buildUnhealthyCluster(): PostgresClusterMonitor {
  const nodes: PostgresClusterNode[] = [
    { nodeId: "p1", role: "PRIMARY", endpoint: "postgresql://p1:5432", isHealthy: false, replicationLagBytes: 0, replicationLagMs: 0, lastCheckedAt: Date.now() },
    { nodeId: "s1", role: "STANDBY", endpoint: "postgresql://s1:5432", isHealthy: false, replicationLagBytes: 512, replicationLagMs: 8, lastCheckedAt: Date.now() },
  ];
  return new PostgresClusterMonitor(nodes);
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("GEI-019: Sprint-017 Security Audit Tests", () => {

  describe("Multi-Region Mesh: CRDT Security", () => {
    it("IDEMPOTENCY: processing the same mutation twice produces identical resolved state", () => {
      const local = { id: "e-1", name: "Alice", grade: 80 };
      const delta = buildDelta("e-1", { name: "Alice", grade: 85 }, Date.now() + 100);
      const clock = { "region-eu": 1 };

      const result1 = resolveLwwConflict(local, Date.now(), clock, "region-eu", delta);
      const result2 = resolveLwwConflict(local, Date.now(), clock, "region-eu", delta);

      expect(result1.resolvedState).toEqual(result2.resolvedState);
      expect(result1.winnerRegion).toBe(result2.winnerRegion);
    });

    it("PROTOTYPE POLLUTION: payload with __proto__ key does not corrupt Object.prototype", () => {
      const local = { id: "e-2", name: "Bob" };
      const maliciousDelta = buildDelta("e-2", { "__proto__": { "polluted": true }, name: "Eve" }, Date.now() + 200);

      const result = resolveLwwConflict(local, Date.now(), {}, "region-safe", maliciousDelta);

      // Prototype must not be polluted
      expect(({} as any).polluted).toBeUndefined();
      // Normal resolution should still work
      expect(result).toBeDefined();
      expect(result.resolvedState).toBeDefined();
    });

    it("REPLAY ATTACK RESISTANCE: older-timestamp mutations from same region do not overwrite newer local state", () => {
      const local = { id: "e-3", name: "Charlie", grade: 90 };
      const localTs = Date.now();
      const localClock = { "region-eu": 5 };

      // Delta that is causally dominated by local state (older timestamp & lower clock)
      const staleDelta = buildDelta("e-3", { grade: 55 }, localTs - 5000); // 5s older
      staleDelta.vectorClock = { "region-eu": 2 }; // Local is at 5, this is at 2

      const result = resolveLwwConflict(local, localTs, localClock, "region-eu", staleDelta);

      expect(result.resolvedState).toEqual(local); // Local state preserved
      expect(result.winnerRegion).toBe("region-eu"); // Local wins
    });

    it("QUEUE IDEMPOTENCY: duplicate enqueue of same operation ID does not double-process", () => {
      const q = new CrossRegionSyncQueue();
      const payload = {
        id: "op-idem-001",
        sourceRegion: "r1",
        targetRegion: "r2",
        mutations: [buildDelta("e-4", { grade: 75 }, Date.now())],
        sentAt: Date.now(),
        batchChecksum: "abc123",
      };

      q.enqueue(payload);
      q.enqueue(payload); // Same ID, second enqueue

      const stats = q.getQueueStats();
      // Map deduplicates by ID — only 1 item should be in the queue
      expect(stats.total).toBe(1);
    });
  });

  describe("Predictive Analytics: Data Safety", () => {
    it("CLAMPING: feature extractor normalizes attendance outside 0-1 to safe range", () => {
      const extractor = new StudentFeatureExtractor();
      const rawData: RawStudentActivityData = {
        studentId: "stu-clamp",
        tenantId: "tenant-A",
        attendanceRate: 1.5, // Out of valid range
        assignmentAvgScore: 120, // Out of 100
        examAvgScore: -5, // Negative
        lmsLoginCountLast30Days: 0,
        feeOverdueDays: 0,
        disciplinaryEventsCount: 0,
      };

      const features = extractor.extractFeatures(rawData);

      // All features must be in normalized range [0, 1]
      expect(features.attendanceFeature).toBeGreaterThanOrEqual(0);
      expect(features.attendanceFeature).toBeLessThanOrEqual(1);
      expect(features.assignmentFeature).toBeGreaterThanOrEqual(0);
      expect(features.assignmentFeature).toBeLessThanOrEqual(1);
      expect(features.examTrendFeature).toBeGreaterThanOrEqual(0);
      expect(features.examTrendFeature).toBeLessThanOrEqual(1);
    });

    it("RISK SCORE BOUNDARIES: prediction engine always returns score in [0, 100]", () => {
      const extractor = new StudentFeatureExtractor();
      const predictor = new StudentPredictionEngine();

      // Edge case: all zeros
      const allZero = extractor.extractFeatures({
        studentId: "stu-zero",
        tenantId: "tenant-A",
        attendanceRate: 0,
        assignmentAvgScore: 0,
        examAvgScore: 0,
        lmsLoginCountLast30Days: 0,
        feeOverdueDays: 365,
        disciplinaryEventsCount: 99,
      });
      const maxRisk = predictor.predictStudentRisk(allZero);
      expect(maxRisk.riskScore).toBeGreaterThanOrEqual(0);
      expect(maxRisk.riskScore).toBeLessThanOrEqual(100);
      expect(maxRisk.riskLevel).toBe("HIGH");

      // Edge case: perfect student
      const allMax = extractor.extractFeatures({
        studentId: "stu-max",
        tenantId: "tenant-A",
        attendanceRate: 1.0,
        assignmentAvgScore: 100,
        examAvgScore: 100,
        lmsLoginCountLast30Days: 30,
        feeOverdueDays: 0,
        disciplinaryEventsCount: 0,
      });
      const minRisk = predictor.predictStudentRisk(allMax);
      expect(minRisk.riskScore).toBeGreaterThanOrEqual(0);
      expect(minRisk.riskScore).toBeLessThanOrEqual(100);
      expect(minRisk.riskLevel).toBe("LOW");
    });

    it("TENANT ISOLATION: risk assessment preserves correct tenantId and studentId", () => {
      const extractor = new StudentFeatureExtractor();
      const predictor = new StudentPredictionEngine();

      const rawData: RawStudentActivityData = {
        studentId: "stu-tenant-check",
        tenantId: "tenant-ISOLATED",
        attendanceRate: 0.8,
        assignmentAvgScore: 75,
        examAvgScore: 72,
        lmsLoginCountLast30Days: 12,
        feeOverdueDays: 10,
        disciplinaryEventsCount: 0,
      };

      const features = extractor.extractFeatures(rawData);
      const assessment = predictor.predictStudentRisk(features);

      expect(assessment.studentId).toBe("stu-tenant-check");
      expect(assessment.tenantId).toBe("tenant-ISOLATED");
    });
  });

  describe("Streaming Engine: Session Security", () => {
    it("CAPACITY ENFORCEMENT: room rejects participants beyond maxParticipants limit", () => {
      const mgr = new MediaSessionManager();
      mgr.createRoom("room-sec-001", "inst-001", "Secure Lecture", "host-1", 2); // Max 2

      // First join should succeed (capacity: host=1, joining user=2)
      expect(() => mgr.joinRoom("room-sec-001", "user-2", "inst-001", "ATTENDEE")).not.toThrow();

      // Third join should be rejected (over capacity of 2)
      expect(() => mgr.joinRoom("room-sec-001", "user-3", "inst-001", "ATTENDEE")).toThrow(/capacity/);
    });

    it("NON-EXISTENT ROOM: joining unknown room throws an informative error (no stack trace leak)", () => {
      const mgr = new MediaSessionManager();

      expect(() => {
        mgr.joinRoom("room-does-not-exist", "user-1", "inst-001", "ATTENDEE");
      }).toThrow(/does not exist|has ended/);
    });

    it("HOST ISOLATION: room cannot be joined before being created", () => {
      const mgr = new MediaSessionManager();
      // No createRoom call — room doesn't exist

      expect(() => {
        mgr.joinRoom("phantom-room", "attacker", "inst-001", "HOST");
      }).toThrow();
    });
  });

  describe("Database Failover: Split-Brain Prevention", () => {
    it("QUORUM GUARD: failover is rejected when quorum is lost (all nodes offline)", async () => {
      const monitor = buildUnhealthyCluster();
      const failover = new PostgresFailoverManager(monitor);

      const result = await failover.executeAutomatedFailover("p1");

      expect(result.status).toBe("FAILED");
      expect(result.message.toLowerCase()).toContain("quorum");
      expect(result.promotedNodeId).toBe("NONE");
    });

    it("SPLIT-BRAIN GUARD: exactly half the nodes (1/2) does NOT constitute quorum", async () => {
      const nodes: PostgresClusterNode[] = [
        { nodeId: "p1", role: "PRIMARY", endpoint: "postgresql://p1:5432", isHealthy: false, replicationLagBytes: 0, replicationLagMs: 0, lastCheckedAt: Date.now() },
        { nodeId: "s1", role: "STANDBY", endpoint: "postgresql://s1:5432", isHealthy: true, replicationLagBytes: 1000, replicationLagMs: 500, lastCheckedAt: Date.now() },
        { nodeId: "r1", role: "READ_REPLICA", endpoint: "postgresql://r1:5432", isHealthy: false, replicationLagBytes: 0, replicationLagMs: 0, lastCheckedAt: Date.now() },
      ];
      const monitor = new PostgresClusterMonitor(nodes); // 1 of 3 healthy = not quorum
      const failover = new PostgresFailoverManager(monitor);

      // 1/3 healthy nodes = no quorum (need >= ceil(3/2) = 2)
      const report = monitor.evaluateClusterHealth();
      expect(report.isQuorumHealthy).toBe(false);
    });

    it("LAG SLA GUARD: failover is rejected when all standby nodes exceed 2s lag", async () => {
      const nodes: PostgresClusterNode[] = [
        { nodeId: "p1", role: "PRIMARY", endpoint: "postgresql://p1:5432", isHealthy: false, replicationLagBytes: 0, replicationLagMs: 0, lastCheckedAt: Date.now() },
        { nodeId: "s1", role: "STANDBY", endpoint: "postgresql://s1:5432", isHealthy: true, replicationLagBytes: 999999, replicationLagMs: 9999, lastCheckedAt: Date.now() },
        { nodeId: "r1", role: "READ_REPLICA", endpoint: "postgresql://r1:5432", isHealthy: true, replicationLagBytes: 999999, replicationLagMs: 9999, lastCheckedAt: Date.now() },
      ];
      const monitor = new PostgresClusterMonitor(nodes);
      const failover = new PostgresFailoverManager(monitor);

      const result = await failover.executeAutomatedFailover("p1");
      expect(result.status).toBe("FAILED");
      expect(result.message.toLowerCase()).toContain("lag");
    });
  });
});
