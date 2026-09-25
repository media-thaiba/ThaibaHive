import { advisingMetrics } from '../../../operations/curriculum/telemetry/advising-metrics';

describe('Prometheus OpenMetrics Academic Advising Exporter (ADVISE-013)', () => {
  it('should export all 8 Prometheus OpenMetrics series properly formatted', () => {
    advisingMetrics.recordSessionStarted();
    advisingMetrics.recordTokenLatency(38);
    advisingMetrics.recordIntentRouted('degree_planner');
    advisingMetrics.recordDagValidation(12);
    advisingMetrics.recordDegreeAudit();
    advisingMetrics.setRetentionRiskGauge(0.42);
    advisingMetrics.recordInterventionTriggered();
    advisingMetrics.recordTransferArticulation();

    const scrapeOutput = advisingMetrics.getScrapeMetrics();

    expect(scrapeOutput).toContain('advise_sessions_total');
    expect(scrapeOutput).toContain('advise_token_latency_ms');
    expect(scrapeOutput).toContain('advise_intent_routing_total{domain="degree_planner"}');
    expect(scrapeOutput).toContain('advise_dag_validation_seconds');
    expect(scrapeOutput).toContain('advise_degree_audits_total');
    expect(scrapeOutput).toContain('advise_retention_risk_gauge');
    expect(scrapeOutput).toContain('advise_interventions_triggered_total');
    expect(scrapeOutput).toContain('advise_transfer_articulations_total');
  });
});
