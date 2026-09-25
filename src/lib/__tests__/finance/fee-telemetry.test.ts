import { FeeTelemetryManager } from '../../operations/finance/telemetry/fee-metrics';

describe('FeeTelemetryManager & Prometheus Metrics (Sprint-057 - FEE-017)', () => {
  let manager: FeeTelemetryManager;

  beforeEach(() => {
    manager = FeeTelemetryManager.getInstance();
    manager.metrics = {
      collectionsTotal: 0,
      amountCollectedCents: 0,
      gatewayLatencyMs: 120,
      webhookSuccessRate: 1.0,
      agingOverdueTotal: 5,
      counterVarianceCents: 0,
      scholarshipDisbursedCents: 0,
      dlqPendingEvents: 0,
    };
  });

  it('should broadcast telemetry events to subscribers and update metric counters', (done) => {
    const unsubscribe = manager.subscribe((event) => {
      expect(event.type).toBe('payment_received');
      expect(event.institutionId).toBe('inst-campus-1');
      expect(event.data.amount).toBe(25000);
      expect(manager.metrics.collectionsTotal).toBe(1);
      expect(manager.metrics.amountCollectedCents).toBe(2500000);
      unsubscribe();
      done();
    });

    manager.broadcastEvent('payment_received', 'inst-campus-1', {
      amount: 25000,
      paymentNumber: 'PAY-100',
    });
  });

  it('should generate valid Prometheus OpenMetrics exposition text', () => {
    const metricsOutput = manager.exportPrometheusMetrics();

    expect(metricsOutput).toContain('# HELP thaiba_fee_collections_total');
    expect(metricsOutput).toContain('# TYPE thaiba_fee_collections_total counter');
    expect(metricsOutput).toContain('thaiba_fee_collections_total');
    expect(metricsOutput).toContain('thaiba_fee_amount_collected_cents');
    expect(metricsOutput).toContain('thaiba_fee_gateway_latency_seconds');
    expect(metricsOutput).toContain('thaiba_fee_webhook_success_rate');
    expect(metricsOutput).toContain('thaiba_fee_aging_overdue_total');
    expect(metricsOutput).toContain('thaiba_fee_counter_variance_cents');
    expect(metricsOutput).toContain('thaiba_fee_scholarship_disbursed_cents');
    expect(metricsOutput).toContain('thaiba_fee_dlq_pending_events');
  });
});
