import { CrossRegionReplicationEngine } from "../mesh/replication-engine";
import { resolveLwwConflict, compareVectorClocks } from "../mesh/crdt-resolver";
import { GlobalQueryRouter } from "../mesh/query-router";
import { RegionHealthManager } from "../mesh/region-health";
import { CrossRegionSyncQueue } from "../mesh/sync-queue";
import { VectorClockManager } from "../mesh/vector-clock";

describe("Multi-Region Data Mesh Integration Test Suite", () => {
  describe("GEI-001: Replication Engine & CRDT Resolver", () => {
    it("should serialize payload and verify checksum accurately", () => {
      const engine = new CrossRegionReplicationEngine("us-east");
      const delta1 = engine.createMutationDelta("student", "stu-001", "inst-1", "INSERT", { name: "Alice" });
      const delta2 = engine.createMutationDelta("student", "stu-002", "inst-1", "UPDATE", { name: "Bob" });

      const payload = engine.serializePayload("eu-west", [delta1, delta2]);
      expect(payload.sourceRegion).toBe("us-east");
      expect(payload.targetRegion).toBe("eu-west");
      expect(payload.mutations.length).toBe(2);
      expect(engine.verifyPayloadChecksum(payload)).toBe(true);
    });

    it("should resolve conflicts deterministically using LWW-CRDT", () => {
      const localState = { id: "stu-001", name: "Alice Original", age: 20 };
      const localTimestamp = 1000;
      const localClock = { "us-east": 1 };

      const engineEU = new CrossRegionReplicationEngine("eu-west");
      const incomingDelta = engineEU.createMutationDelta("student", "stu-001", "inst-1", "UPDATE", { name: "Alice Updated", age: 21 });
      incomingDelta.timestamp = 2000; // Newer timestamp

      const result = resolveLwwConflict(localState, localTimestamp, localClock, "us-east", incomingDelta);
      expect(result.resolvedState.name).toBe("Alice Updated");
      expect(result.resolvedState.age).toBe(21);
      expect(result.winnerRegion).toBe("eu-west");
    });
  });

  describe("GEI-002: Query Router & Region Health Manager", () => {
    it("should route WRITE query to healthy primary and READ query to nearest node", () => {
      const healthManager = new RegionHealthManager([
        { regionId: "us-east", nodeName: "Node-US", endpoint: "https://us.api.com", status: "ONLINE", latencyMs: 15, lastHeartbeat: Date.now() },
        { regionId: "eu-west", nodeName: "Node-EU", endpoint: "https://eu.api.com", status: "ONLINE", latencyMs: 80, lastHeartbeat: Date.now() },
      ]);

      const router = new GlobalQueryRouter(healthManager);
      router.setTenantPrimaryRegion("inst-1", "us-east");

      const writeDecision = router.routeQuery({ tenantId: "inst-1", queryType: "WRITE", entityName: "student" });
      expect(writeDecision.targetRegionId).toBe("us-east");
      expect(writeDecision.failoverApplied).toBe(false);

      const readDecision = router.routeQuery({ tenantId: "inst-1", queryType: "READ", entityName: "student", preferredRegion: "us-east" });
      expect(readDecision.targetRegionId).toBe("us-east");
    });

    it("should failover READ/WRITE query if primary node is OFFLINE", () => {
      const healthManager = new RegionHealthManager([
        { regionId: "us-east", nodeName: "Node-US", endpoint: "https://us.api.com", status: "OFFLINE", latencyMs: 15, lastHeartbeat: Date.now() },
        { regionId: "eu-west", nodeName: "Node-EU", endpoint: "https://eu.api.com", status: "ONLINE", latencyMs: 80, lastHeartbeat: Date.now() },
      ]);

      const router = new GlobalQueryRouter(healthManager);
      router.setTenantPrimaryRegion("inst-1", "us-east");

      const writeDecision = router.routeQuery({ tenantId: "inst-1", queryType: "WRITE", entityName: "student" });
      expect(writeDecision.targetRegionId).toBe("eu-west");
      expect(writeDecision.failoverApplied).toBe(true);
    });
  });

  describe("GEI-003: Vector Clock & Sync Queue", () => {
    it("should increment and compare vector clocks correctly", () => {
      const vclock = new VectorClockManager("us-east");
      const clock1 = vclock.tick();
      expect(clock1["us-east"]).toBe(1);

      const clock2 = vclock.merge({ "eu-west": 5 });
      expect(clock2["eu-west"]).toBe(5);
      expect(clock2["us-east"]).toBe(2);
    });

    it("should queue sync payloads and manage retries & idempotency", () => {
      const queue = new CrossRegionSyncQueue();
      const engine = new CrossRegionReplicationEngine("us-east");
      const payload = engine.serializePayload("eu-west", []);

      const item = queue.enqueue(payload);
      expect(item.status).toBe("PENDING");

      queue.markProcessing(item.id);
      expect(queue.getQueueStats().processing).toBe(1);

      queue.acknowledge(item.id);
      expect(queue.isAlreadyProcessed(item.id)).toBe(true);
      expect(queue.getQueueStats().acknowledged).toBe(1);
    });
  });
});
