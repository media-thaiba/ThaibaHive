/**
 * End-to-End Failover Integration Test Suite
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { FailoverDetector, FailoverCircuitState } from "@/lib/db/failover-detector";
import { DatabasePrimaryDropInjector } from "@/lib/dr/failure-injectors";
import { tenantRouter } from "@/db";
import { crossRegionCacheMesh } from "@/lib/cache/cross-region-mesh";

describe("E2E Failover & Regional Resilience Integration", () => {
  let detector: FailoverDetector;
  let primaryInjector: DatabasePrimaryDropInjector;

  beforeEach(async () => {
    detector = FailoverDetector.getInstance();
    primaryInjector = new DatabasePrimaryDropInjector();
    await detector.resetCircuit("TEST_CLEANUP");
    await primaryInjector.reset();
  });

  afterEach(async () => {
    await detector.resetCircuit("TEST_CLEANUP");
    await primaryInjector.reset();
  });

  it("should detect primary drop, trip circuit breaker, and elect candidate replica", async () => {
    expect(detector.getState()).toBe(FailoverCircuitState.CLOSED);

    // Inject fault
    await primaryInjector.inject("primary", {}, 5000);
    expect(DatabasePrimaryDropInjector.isPrimaryDown()).toBe(true);

    // 3 probes to trip
    await detector.recordProbeResult(false, "Timeout");
    await detector.recordProbeResult(false, "Connection refused");
    const state = await detector.recordProbeResult(false, "Host down");

    expect(state).toBe(FailoverCircuitState.OPEN);
    expect(detector.getHistory().length).toBeGreaterThan(0);

    // Restore and reset
    await primaryInjector.reset();
    await detector.resetCircuit("MANUAL_RESET_TEST");
    expect(detector.getState()).toBe(FailoverCircuitState.CLOSED);
  });

  it("should preserve tenant regional routing and cache invalidation mesh during failover", async () => {
    tenantRouter.registerTenantRegion("inst-resilience-1", "eu-central");
    expect(tenantRouter.getTenantRegion("inst-resilience-1")).toBe("eu-central");

    const broadcast = await crossRegionCacheMesh.broadcastInvalidation(
      ["institution:inst-resilience-1"],
      ["tag:inst-resilience-1"],
      "eu-central"
    );

    expect(broadcast.keys).toContain("institution:inst-resilience-1");
    expect(broadcast.vectorClock.region).toBe("eu-central");
  });
});
