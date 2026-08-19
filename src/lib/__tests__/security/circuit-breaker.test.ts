/**
 * Unit Tests for GatewayCircuitBreaker and DegradedModeController
 * Sprint-038 / AGS-010
 */

import { GatewayCircuitBreaker } from "../../security/circuit-breaker";
import { DegradedModeController } from "../../security/degraded-mode";
import { CanaryProbeCollector } from "../../security/canary-probes";

describe("GatewayCircuitBreaker & DegradedMode (AGS-010)", () => {
  let breaker: GatewayCircuitBreaker;
  let degraded: DegradedModeController;
  let canary: CanaryProbeCollector;

  beforeEach(() => {
    canary = new CanaryProbeCollector();
    degraded = new DegradedModeController();
    breaker = new GatewayCircuitBreaker(degraded, canary);
    breaker.reset();
  });

  it("should initialize in CLOSED state and not shed requests", () => {
    expect(breaker.getState()).toBe("CLOSED");
    expect(degraded.isActive()).toBe(false);
    expect(degraded.shouldShedRequest("staff", "query").shed).toBe(false);
  });

  it("should trip to OPEN after 3 consecutive degraded evaluations", () => {
    const now = 1_000_000;
    // Add unhealthy probes (100% error)
    canary.recordProbe({ route: "/api/health", durationMs: 250, statusCode: 500, timestamp: now, success: false });

    expect(breaker.evaluateHealthSignals(now)).toBe("CLOSED"); // 1st failure
    expect(breaker.evaluateHealthSignals(now)).toBe("CLOSED"); // 2nd failure
    expect(breaker.evaluateHealthSignals(now)).toBe("OPEN"); // 3rd failure -> trips to OPEN

    expect(degraded.isActive()).toBe(true);

    // Should shed public query
    const shedPublic = degraded.shouldShedRequest(undefined, "public");
    expect(shedPublic.shed).toBe(true);

    // Should not shed admin request
    const shedAdmin = degraded.shouldShedRequest("admin", "mutation");
    expect(shedAdmin.shed).toBe(false);
  });

  it("should allow manual trip and manual reset", () => {
    breaker.manualTrip("Emergency load mitigation");
    expect(breaker.getState()).toBe("OPEN");
    expect(degraded.isActive()).toBe(true);

    breaker.manualReset();
    expect(breaker.getState()).toBe("CLOSED");
    expect(degraded.isActive()).toBe(false);
  });
});
