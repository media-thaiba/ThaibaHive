/**
 * Cross-Region Cache Mesh Unit Tests
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { CrossRegionCacheMesh } from "../cross-region-mesh";
import { RedisClusterClient } from "../redis-cluster";
import { RedisMeshPartitionInjector } from "../../dr/failure-injectors";

describe("CrossRegionCacheMesh", () => {
  let mesh: CrossRegionCacheMesh;

  beforeEach(() => {
    mesh = CrossRegionCacheMesh.getInstance();
    mesh.setEnabled(true);
    mesh.setLocalRegion("default");
  });

  it("should broadcast invalidation message across peer regions", async () => {
    const msg = await mesh.broadcastInvalidation(["user:101", "dept:math"], ["tag:inst-101"], "default");

    expect(msg.id).toBeDefined();
    expect(msg.sourceRegion).toBe("default");
    expect(msg.keys).toContain("user:101");
    expect(msg.tags).toContain("tag:inst-101");
    expect(msg.vectorClock.region).toBe("default");
    expect(msg.vectorClock.counter).toBeGreaterThan(0);
  });

  it("should return accurate cluster health report", () => {
    const report = mesh.getHealthReport();

    expect(report.meshStatus).toBe("healthy");
    expect(report.totalRegions).toBeGreaterThanOrEqual(3);
    expect(report.healthyRegions).toBe(report.totalRegions);
    expect(report.nodes.length).toBe(report.totalRegions);
  });

  it("should gracefully handle network partition on peer region", async () => {
    const partitionInjector = new RedisMeshPartitionInjector();
    await partitionInjector.inject("ap-south", {}, 5000);

    const report = mesh.getHealthReport();
    expect(report.meshStatus).toBe("degraded");

    // Broadcast should succeed without throwing unhandled exceptions
    await expect(
      mesh.broadcastInvalidation(["key:partition-test"], ["tag:all"], "default")
    ).resolves.toBeDefined();

    await partitionInjector.reset();
  });

  it("should queue and debounce invalidations within configured window", async () => {
    await mesh.queueDebouncedInvalidation(["user:101"], ["tag:inst-101"], "default", 20);
    await mesh.queueDebouncedInvalidation(["user:102"], ["tag:inst-102"], "default", 20);

    // Wait for debounce flush
    await new Promise((r) => setTimeout(r, 40));
    const report = mesh.getHealthReport();
    expect(report.totalEventsBroadcast).toBeGreaterThan(0);
  });
});
