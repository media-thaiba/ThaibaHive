import { kmTelemetry } from '@/lib/operations/km/km-telemetry';
import { getAllMetrics, getCounter, getGauge } from '@/lib/metrics/registry';
import { wsClientManager } from '@/lib/operations/km/streaming/ws-client-manager';

describe('KM & Copilot Telemetry (KM-020)', () => {
  it('should verify all 8 KM metrics are registered', () => {
    const all = getAllMetrics();
    const kmMetricNames = [
      'km_queries_total',
      'km_query_duration_seconds',
      'km_hybrid_retrieval_latency_seconds',
      'km_vector_search_recall_ratio',
      'km_copilot_token_usage_total',
      'km_degree_audits_total',
      'km_deflection_rate_gauge',
      'km_active_websocket_connections_gauge',
    ];

    for (const name of kmMetricNames) {
      expect(all.some((m) => m.name === name)).toBe(true);
    }
  });

  it('should track queries, token counts and deflection rate', () => {
    kmTelemetry.trackQuery('Prerequisites', 'success', 0.25);
    kmTelemetry.trackTokenUsage(120);
    kmTelemetry.updateDeflectionRate(0.85);

    expect(getCounter('km_queries_total')).toBeGreaterThan(0);
    expect(getCounter('km_copilot_token_usage_total')).toBeGreaterThanOrEqual(120);
    expect(getGauge('km_deflection_rate_gauge')).toBe(0.85);
  });
});
