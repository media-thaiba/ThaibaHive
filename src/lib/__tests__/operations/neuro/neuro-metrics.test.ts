import { NeuroMetricsExporter } from '../../../operations/neuro/telemetry/neuro-metrics';

describe('NeuroMetricsExporter — Prometheus OpenMetrics (NEURO-013)', () => {
  let metrics: NeuroMetricsExporter;

  beforeEach(() => {
    metrics = NeuroMetricsExporter.getInstance();
    metrics.clear();
  });

  it('should register gauges and counters and export valid OpenMetrics 1.0 format', () => {
    metrics.setMetric(
      'neuro_gpu_utilization_percent',
      'gauge',
      'GPU compute utilization percentage',
      { cluster: 'titan-01', node: 'dgx-01', gpu: '0' },
      94.5
    );

    metrics.incrementCounter(
      'neuro_spot_arbitrage_savings_total',
      'Cumulative dollars saved via spot arbitrage',
      { cluster: 'titan-01' },
      1420.50
    );

    const output = metrics.exportMetricsText();

    expect(output).toContain('# HELP neuro_gpu_utilization_percent');
    expect(output).toContain('# TYPE neuro_gpu_utilization_percent gauge');
    expect(output).toContain('neuro_gpu_utilization_percent{cluster="titan-01",gpu="0",node="dgx-01"} 94.5');
    expect(output).toContain('neuro_spot_arbitrage_savings_total{cluster="titan-01"} 1420.5');
  });
});
