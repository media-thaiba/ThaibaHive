

import { RedisClusterClient } from "../redis/redis-cluster-client";
import { RedisClusterManager } from "../redis/redis-cluster-manager";
import { InMemoryStateAdapter } from "../services/redis-client";

describe("STREAM-003: Redis Cluster Key Sharding & Multi-Region Health Monitor", () => {
  it("formats tenant hashtag keys to guarantee cluster hash slot alignment", () => {
    const client = new RedisClusterClient(new InMemoryStateAdapter());
    const manager = new RedisClusterManager(client);

    const key1 = manager.getShardedKey("tenant-100", "circuit_breaker", "state");
    const key2 = manager.getShardedKey("tenant-100", "dedup", "req_99");

    expect(key1).toBe("thaiba:{tenant-100}:circuit_breaker:state");
    expect(key2).toBe("thaiba:{tenant-100}:dedup:req_99");

    // Both keys must extract identical hashtag content 'tenant-100'
    const tag1 = key1.match(/\{([^}]+)\}/)?.[1];
    const tag2 = key2.match(/\{([^}]+)\}/)?.[1];
    expect(tag1).toBe("tenant-100");
    expect(tag2).toBe(tag1);
  });

  it("calculates deterministic hash slot within 0-16383 range", () => {
    const manager = new RedisClusterManager();
    const slot = manager.calculateSlot("tenant-south-01");
    expect(slot).toBeGreaterThanOrEqual(0);
    expect(slot).toBeLessThan(16384);
  });

  it("executes cluster operations with in-memory fallback adapter", async () => {
    const client = new RedisClusterClient(new InMemoryStateAdapter());
    const manager = new RedisClusterManager(client);

    const result = await manager.executeClusterOperation("tenant-abc", async (cl, shardedKey) => {
      const k = shardedKey("stream", "status");
      await cl.set(k, "ACTIVE", 60);
      return cl.get(k);
    });

    expect(result).toBe("ACTIVE");
  });

  it("retrieves cluster health metrics", async () => {
    const manager = new RedisClusterManager();
    const metrics = await manager.getClusterHealthMetrics("tenant-xyz");

    expect(metrics.activeNodes).toBe(3);
    expect(metrics.totalSlots).toBe(16384);
    expect(metrics.slotHashAlgorithm).toBe("CRC16");
    expect(metrics.nodeStatuses.length).toBe(3);
  });
});
