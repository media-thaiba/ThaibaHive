import { DatabaseHealer } from "../agents/healing/database-healer";
import { EdgeHealer } from "../agents/healing/edge-healer";
import { PoolHealer, dynamicPoolConfigs } from "../agents/healing/pool-healer";
import { StreamHealer } from "../agents/healing/stream-healer";
import { ApprovalGateway } from "../agents/healing/approval-gateway";
import { ConsensusCoordinator } from "../agents/core/consensus";
import { AgentRegistry } from "../agents/core/registry";
import { AgentStateStore } from "../agents/core/state-store";
import { db } from "@thaiba/db";
import { clusterNodes, edgeNodes, cacheEvents, failoverEvents } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";
import { defaultStateStore } from "../services/redis-client";

describe("Self-Healing Infrastructure Agents Integration Test Suite", () => {
  beforeEach(async () => {
    // Clear registry, approvals, and cooldowns
    AgentRegistry.getInstance().clear();
    ApprovalGateway.getInstance().clear();
    dynamicPoolConfigs.clear();
    
    // Set up mock DB data
    await db.delete(clusterNodes).run();
    await db.delete(edgeNodes).run();
    await db.delete(cacheEvents).run();
    await db.delete(failoverEvents).run();

    await db
      .insert(clusterNodes)
      .values([
        {
          id: "node-1",
          nodeId: "primary-db",
          role: "PRIMARY",
          endpoint: "postgresql://primary.local",
          isHealthy: true,
          replicationLagMs: 0,
        },
        {
          id: "node-2",
          nodeId: "standby-db",
          role: "READ_REPLICA",
          endpoint: "postgresql://standby.local",
          isHealthy: true,
          replicationLagMs: 100,
        },
      ])
      .run();

    await db
      .insert(edgeNodes)
      .values([
        {
          id: "edge-node-1",
          nodeRegion: "US",
          nodeName: "us-worker",
          endpoint: "https://us.edge.local",
          status: "ONLINE",
          latencyMs: 50,
        },
      ])
      .run();
  });

  afterEach(() => {
    ApprovalGateway.getInstance().clear();
  });

  afterAll(async () => {
    await db.delete(clusterNodes).run();
    await db.delete(edgeNodes).run();
    await db.delete(cacheEvents).run();
    await db.delete(failoverEvents).run();
  });

  test("DatabaseHealer - replication lag mark unhealthy & primary failover with approval", async () => {
    const healer = new DatabaseHealer();
    const gateway = ApprovalGateway.getInstance();

    // 1. Standby lag mitigation check
    await db
      .update(clusterNodes)
      .set({ replicationLagMs: 15000 })
      .where(eq(clusterNodes.id, "node-2"))
      .run();

    await healer.checkHealth();

    const standbyNode = await db.select().from(clusterNodes).where(eq(clusterNodes.id, "node-2")).get();
    expect(standbyNode?.isHealthy).toBe(false);

    // 2. Primary failover execution check
    // Mark standby healthy and primary unhealthy
    await db
      .update(clusterNodes)
      .set({ isHealthy: true, replicationLagMs: 0 })
      .where(eq(clusterNodes.id, "node-2"))
      .run();
    
    await db
      .update(clusterNodes)
      .set({ isHealthy: false })
      .where(eq(clusterNodes.id, "node-1"))
      .run();

    // Mock asynchronous approval from human gateway in parallel
    const failoverPromise = healer.checkHealth();

    // Give it a tiny moment to post the approval request
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    const pending = gateway.getPendingRequests();
    expect(pending.length).toBe(1);
    expect(pending[0].targetAsset).toBe("db-cluster");

    // Approve the failover
    await gateway.approve(pending[0].id);

    // Await healer complete failover loop
    await failoverPromise;

    const promotedNode = await db.select().from(clusterNodes).where(eq(clusterNodes.id, "node-2")).get();
    const demotedNode = await db.select().from(clusterNodes).where(eq(clusterNodes.id, "node-1")).get();
    const events = await db.select().from(failoverEvents).all();

    expect(promotedNode?.role).toBe("PRIMARY");
    expect(demotedNode?.role).toBe("READ_REPLICA");
    expect(demotedNode?.isHealthy).toBe(false);
    expect(events.length).toBe(1);
    expect(events[0].promotedNodeId).toBe("standby-db");
  });

  test("EdgeHealer - worker auto-recovery fallback & cache invalidation", async () => {
    const healer = new EdgeHealer();
    const telemetry = [
      {
        nodeId: "edge-node-1",
        errorRate: 0.15, // 15% errors (triggers recovery)
        latencyMs: 80,
      },
    ];

    await healer.checkHealth(telemetry);

    const node = await db.select().from(edgeNodes).where(eq(edgeNodes.id, "edge-node-1")).get();
    const evicts = await db.select().from(cacheEvents).all();

    expect(node?.status).toBe("OFFLINE");
    expect(node?.latencyMs).toBe(9999);
    expect(evicts.length).toBe(1);
    expect(evicts[0].action).toBe("EVICT");
    expect(evicts[0].cacheKey).toContain("edge-node-1");
  });

  test("PoolHealer - pool scaling limits incremental sizing", async () => {
    const healer = new PoolHealer();
    
    // 1. High latency triggers scale up
    await healer.monitorPools([{
      poolName: "primary-pool",
      activeConnections: 18,
      maxConnections: 20,
      queueWaitTimeMs: 250,
    }]);

    expect(dynamicPoolConfigs.get("primary-pool")?.maxConnections).toBe(30); // 20 * 1.5 = 30

    // Clear cooldown to allow scale down check
    await defaultStateStore.del("cooldown:pool:primary-pool");

    // 2. Under-utilization triggers scale down
    await healer.monitorPools([{
      poolName: "primary-pool",
      activeConnections: 5,
      maxConnections: 30,
      queueWaitTimeMs: 10,
    }]);

    expect(dynamicPoolConfigs.get("primary-pool")?.maxConnections).toBe(24); // 30 * 0.8 = 24
  });

  test("StreamHealer - WebRTC restarts, transcoder resets, and endpoint redirects", async () => {
    const healer = new StreamHealer();

    // 1. Signaling Latency restart
    await healer.checkStreamingNodes([{
      nodeId: "stream-node-1",
      signalingLatencyMs: 650,
      segmenterErrorCount: 0,
      isHealthy: true,
    }]);

    expect(healer.executedRestarts).toContain("stream-node-1:signaling");

    // Clear cooldown to allow transcoder check
    await defaultStateStore.del("cooldown:stream:stream-node-1");

    // 2. Transcoder error reset
    await healer.checkStreamingNodes([{
      nodeId: "stream-node-1",
      signalingLatencyMs: 100,
      segmenterErrorCount: 5,
      isHealthy: true,
    }]);

    expect(healer.executedRestarts).toContain("stream-node-1:transcoder");

    // Clear cooldown to allow redirect check
    await defaultStateStore.del("cooldown:route:room-101");

    // 3. Unhealthy stream redirect routing
    await healer.checkStreamingNodes([{
      nodeId: "stream-node-1",
      signalingLatencyMs: 100,
      segmenterErrorCount: 0,
      isHealthy: false,
    }], "room-101");

    expect(healer.activeStreamsRoute.get("room-101")).toContain("backup-stream.thaibahive.local");
  });
});
