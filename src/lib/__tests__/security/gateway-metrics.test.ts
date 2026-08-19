/**
 * Unit Tests for GatewayMetricsTracker
 * Sprint-038 / AGS-014 & Sprint-039 / TIF-017
 */

import { GatewayMetricsTracker } from "../../security/gateway-metrics";
import { metricsRegistry } from "../../observability/metrics-registry";

describe("Gateway Metrics & Prometheus Registry (AGS-014 & TIF-017)", () => {
  let tracker: GatewayMetricsTracker;

  beforeEach(() => {
    tracker = new GatewayMetricsTracker();
    tracker.reset();
  });

  it("should record counters, gauges, and summaries accurately", () => {
    tracker.recordRequest();
    tracker.recordRequest();
    tracker.recordRateLimitViolation();
    tracker.setActiveQuarantines(5);
    tracker.setCircuitBreakerState("OPEN");
    tracker.recordProbeDuration(0.015);
    tracker.recordThreatScore(85);
    tracker.recordThreatIndicatorsImported(25);
    tracker.recordMeshPubSubEvent(0.012);
    tracker.recordLegacyTokenRejection();
    tracker.recordWafSigV4Request();

    const counts = tracker.getCounters();
    expect(counts.requestsTotal).toBe(2);
    expect(counts.rateLimitViolationsTotal).toBe(1);
    expect(counts.activeQuarantines).toBe(5);
    expect(counts.circuitBreakerState).toBe(2); // OPEN = 2
    expect(counts.probeDurationCount).toBe(1);
    expect(counts.threatScoreCount).toBe(1);
    expect(counts.threatIndicatorsImportedTotal).toBe(25);
    expect(counts.meshPubSubEventsTotal).toBe(1);
    expect(counts.legacyTokenRejectionsTotal).toBe(1);
    expect(counts.wafSigV4RequestsTotal).toBe(1);
  });

  it("should format OpenMetrics text correctly", () => {
    tracker.recordRequest();
    tracker.recordRateLimitViolation();
    tracker.setActiveQuarantines(3);
    tracker.recordThreatIndicatorsImported(10);

    const text = tracker.generateOpenMetricsText();
    expect(text).toContain("gateway_requests_total 1");
    expect(text).toContain("gateway_ratelimit_violations_total 1");
    expect(text).toContain("gateway_ip_quarantines_active 3");
    expect(text).toContain("threat_intel_indicators_imported_total 10");
  });

  it("should have all gateway and threat intel metrics registered in unified registry", () => {
    const gatewayDefs = metricsRegistry.getDefinitionsByModule("gateway");
    const threatIntelDefs = metricsRegistry.getDefinitionsByModule("threat_intel");

    expect(gatewayDefs.length).toBeGreaterThanOrEqual(10);
    expect(threatIntelDefs.length).toBeGreaterThanOrEqual(1);
    expect(gatewayDefs.map((d) => d.name)).toContain("gateway_requests_total");
    expect(gatewayDefs.map((d) => d.name)).toContain("mesh_pubsub_sync_latency_seconds");
    expect(threatIntelDefs.map((d) => d.name)).toContain("threat_intel_indicators_imported_total");
  });
});
