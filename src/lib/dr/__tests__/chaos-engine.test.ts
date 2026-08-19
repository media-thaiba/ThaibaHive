/**
 * Chaos Engine & Failure Injector Unit Tests
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { ChaosEngine } from "../chaos-engine";
import {
  DatabasePrimaryDropInjector,
  EdgeCacheDisconnectInjector,
  NetworkPartitionInjector,
  RedisMeshPartitionInjector,
  ReplicaLagInjector,
} from "../failure-injectors";

describe("ChaosEngine & Failure Injectors", () => {
  let engine: ChaosEngine;

  beforeEach(async () => {
    engine = ChaosEngine.getInstance();
    await engine.resetAll();
  });

  afterEach(async () => {
    await engine.resetAll();
  });

  it("should initialize with all failure injectors registered", () => {
    expect(engine.getInjector("DATABASE_PRIMARY_DROP")).toBeDefined();
    expect(engine.getInjector("REPLICA_LAG_INJECTION")).toBeDefined();
    expect(engine.getInjector("NETWORK_PARTITION")).toBeDefined();
    expect(engine.getInjector("EDGE_CACHE_DISCONNECT")).toBeDefined();
    expect(engine.getInjector("REDIS_MESH_PARTITION")).toBeDefined();
  });

  it("should inject and remove database primary drop failure", async () => {
    expect(DatabasePrimaryDropInjector.isPrimaryDown()).toBe(false);

    const fault = await engine.injectFailure("DATABASE_PRIMARY_DROP", "primary", {}, 5000);
    expect(fault.active).toBe(true);
    expect(fault.type).toBe("DATABASE_PRIMARY_DROP");
    expect(DatabasePrimaryDropInjector.isPrimaryDown()).toBe(true);

    const activeFaults = engine.getAllActiveFaults();
    expect(activeFaults.length).toBe(1);
    expect(activeFaults[0].id).toBe(fault.id);

    const removed = await engine.removeFailure(fault.id);
    expect(removed).toBe(true);
    expect(DatabasePrimaryDropInjector.isPrimaryDown()).toBe(false);
    expect(engine.getAllActiveFaults().length).toBe(0);
  });

  it("should inject replica lag correctly", async () => {
    expect(ReplicaLagInjector.getInjectedLag("replica-1")).toBe(0);

    const fault = await engine.injectFailure("REPLICA_LAG_INJECTION", "replica-1", { lagMs: 8000 }, 5000);
    expect(ReplicaLagInjector.getInjectedLag("replica-1")).toBe(8000);

    await engine.removeFailure(fault.id);
    expect(ReplicaLagInjector.getInjectedLag("replica-1")).toBe(0);
  });

  it("should inject network partition on target region", async () => {
    expect(NetworkPartitionInjector.isRegionPartitioned("eu-central")).toBe(false);

    const fault = await engine.injectFailure("NETWORK_PARTITION", "eu-central", {}, 5000);
    expect(NetworkPartitionInjector.isRegionPartitioned("eu-central")).toBe(true);

    await engine.removeFailure(fault.id);
    expect(NetworkPartitionInjector.isRegionPartitioned("eu-central")).toBe(false);
  });

  it("should inject edge cache disconnect and redis mesh partition", async () => {
    const fault1 = await engine.injectFailure("EDGE_CACHE_DISCONNECT", "edge-cdn");
    const fault2 = await engine.injectFailure("REDIS_MESH_PARTITION", "ap-south");

    expect(EdgeCacheDisconnectInjector.isEdgeCacheDisconnected()).toBe(true);
    expect(RedisMeshPartitionInjector.isMeshPartitioned("ap-south")).toBe(true);

    await engine.resetAll();
    expect(EdgeCacheDisconnectInjector.isEdgeCacheDisconnected()).toBe(false);
    expect(RedisMeshPartitionInjector.isMeshPartitioned("ap-south")).toBe(false);
    expect(engine.getAllActiveFaults().length).toBe(0);
  });
});
