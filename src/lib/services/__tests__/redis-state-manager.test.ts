import { RedisStateManager } from "../redis-state-manager";
import { InMemoryStateAdapter } from "../redis-client";

describe("Sprint-011 Redis State Manager & Distributed State", () => {
  let adapter: InMemoryStateAdapter;
  let manager: RedisStateManager;

  beforeEach(() => {
    adapter = new InMemoryStateAdapter();
    manager = new RedisStateManager(adapter);
  });

  describe("Circuit Breaker State", () => {
    it("starts in CLOSED state", async () => {
      const status = await manager.getCircuitState("inst_101", "copilot_query");
      expect(status.state).toBe("CLOSED");
      expect(status.failureCount).toBe(0);
    });

    it("trips circuit breaker to OPEN when failure threshold is reached", async () => {
      const tenant = "inst_101";
      const feature = "remediation_engine";

      for (let i = 0; i < 4; i++) {
        const res = await manager.recordFailure(tenant, feature, 5);
        expect(res.state).toBe("CLOSED");
      }

      const tripped = await manager.recordFailure(tenant, feature, 5);
      expect(tripped.state).toBe("OPEN");
      expect(tripped.failureCount).toBe(5);
      expect(tripped.lastTrippedAt).toBeTruthy();
    });

    it("resets circuit breaker state cleanly", async () => {
      const tenant = "inst_101";
      const feature = "remediation_engine";

      await manager.recordFailure(tenant, feature, 1);
      await manager.resetCircuit(tenant, feature);

      const status = await manager.getCircuitState(tenant, feature);
      expect(status.state).toBe("CLOSED");
      expect(status.failureCount).toBe(0);
    });
  });

  describe("Request Deduplication", () => {
    it("flags duplicate requests within TTL window", async () => {
      const tenant = "inst_101";
      const dedupKey = "query_hash_abc123";

      const firstCall = await manager.isDuplicateRequest(tenant, dedupKey, 60);
      expect(firstCall).toBe(false);

      const secondCall = await manager.isDuplicateRequest(tenant, dedupKey, 60);
      expect(secondCall).toBe(true);
    });
  });

  describe("Cache Store & Mode", () => {
    it("stores and retrieves cached payloads with tenant isolation", async () => {
      const payload = { result: "ok", count: 42 };
      await manager.setCache("inst_101", "insights_key", payload);

      const cached = await manager.getCache<typeof payload>("inst_101", "insights_key");
      expect(cached).toEqual(payload);

      // Verify cross-tenant isolation
      const otherTenant = await manager.getCache<typeof payload>("inst_202", "insights_key");
      expect(otherTenant).toBeNull();
    });

    it("reports in-memory fallback status when Redis connection is absent", () => {
      expect(manager.isRedisConnected()).toBe(false);
    });
  });
});
