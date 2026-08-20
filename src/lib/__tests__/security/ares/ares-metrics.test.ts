/**
 * Unit tests for AresMetricsTracker (ARES-019)
 */

import { AresMetricsTracker } from '@/lib/security/ares/ares-metrics';

describe('ARES-019: AresMetricsTracker', () => {
  beforeEach(() => {
    AresMetricsTracker.resetInstance();
  });

  it('should generate standard Prometheus OpenMetrics text format with all 6 series', () => {
    const tracker = AresMetricsTracker.getInstance();

    tracker.recordThreatProbability('CREDENTIAL_STUFFING', 'CRITICAL_FORECAST', 0.88);
    tracker.setActiveChaosExperiments('RUNNING', 2);
    tracker.recordCircuitBreakerTrip('LATENCY_BREACH');
    tracker.recordZkpVerificationDuration(0.024);
    tracker.setGraphNodes('ThreatActor', 15);
    tracker.setResilienceScore('FaultTolerance', 92.5);

    const metricsText = tracker.toOpenMetrics();

    expect(metricsText).toContain('ares_predictive_threat_probability{category="CREDENTIAL_STUFFING",severity="CRITICAL_FORECAST"} 0.8800');
    expect(metricsText).toContain('ares_chaos_experiments_active{status="RUNNING"} 2');
    expect(metricsText).toContain('ares_chaos_circuit_breaker_trips_total{reason="LATENCY_BREACH"} 1');
    expect(metricsText).toContain('ares_zkp_verification_duration_seconds_bucket{le="0.025"} 1');
    expect(metricsText).toContain('ares_threat_graph_nodes_total{type="ThreatActor"} 15');
    expect(metricsText).toContain('ares_resilience_score{vector="FaultTolerance"} 92.5');
  });
});
