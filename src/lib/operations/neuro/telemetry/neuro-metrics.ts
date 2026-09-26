export interface PrometheusMetricEntry {
  name: string;
  type: 'gauge' | 'counter' | 'histogram';
  help: string;
  labels: Record<string, string>;
  value: number;
}

export class NeuroMetricsExporter {
  private static instance: NeuroMetricsExporter;
  private metrics: Map<string, PrometheusMetricEntry> = new Map();

  public static getInstance(): NeuroMetricsExporter {
    if (!NeuroMetricsExporter.instance) {
      NeuroMetricsExporter.instance = new NeuroMetricsExporter();
    }
    return NeuroMetricsExporter.instance;
  }

  public setMetric(name: string, type: 'gauge' | 'counter' | 'histogram', help: string, labels: Record<string, string>, value: number): void {
    const labelKey = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    const key = `${name}{${labelKey}}`;

    this.metrics.set(key, {
      name,
      type,
      help,
      labels,
      value,
    });
  }

  public incrementCounter(name: string, help: string, labels: Record<string, string>, delta: number = 1): void {
    const labelKey = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    const key = `${name}{${labelKey}}`;

    const existing = this.metrics.get(key);
    const newVal = (existing?.value || 0) + delta;
    this.setMetric(name, 'counter', help, labels, newVal);
  }

  /**
   * Formats all metrics into Prometheus OpenMetrics 1.0 text format.
   */
  public exportMetricsText(): string {
    const lines: string[] = [
      '# HELP neuro_gpu_utilization_percent GPU compute utilization percentage (0-100)',
      '# TYPE neuro_gpu_utilization_percent gauge',
      '# HELP neuro_vram_allocated_bytes Allocated GPU memory in bytes',
      '# TYPE neuro_vram_allocated_bytes gauge',
      '# HELP neuro_jobs_queued_total Current total queued pending jobs',
      '# TYPE neuro_jobs_queued_total gauge',
      '# HELP neuro_jobs_running_total Current total actively running jobs',
      '# TYPE neuro_jobs_running_total gauge',
      '# HELP neuro_job_duration_seconds Runtime duration of completed jobs in seconds',
      '# TYPE neuro_job_duration_seconds gauge',
      '# HELP neuro_cloud_cost_hourly_usd Estimated hourly cloud compute expenditure',
      '# TYPE neuro_cloud_cost_hourly_usd gauge',
      '# HELP neuro_spot_arbitrage_savings_total Cumulative dollars saved via spot arbitrage',
      '# TYPE neuro_spot_arbitrage_savings_total counter',
      '# HELP neuro_spot_preemptions_total Total spot instance preemption events intercepted',
      '# TYPE neuro_spot_preemptions_total counter',
      '# HELP neuro_grant_tokens_consumed_total Total research compute tokens debited',
      '# TYPE neuro_grant_tokens_consumed_total counter',
      '# HELP neuro_carbon_saved_kg Estimated carbon offset in kg CO2e',
      '# TYPE neuro_carbon_saved_kg counter',
    ];

    for (const m of this.metrics.values()) {
      const labelStr = Object.entries(m.labels)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      lines.push(`${m.name}{${labelStr}} ${m.value}`);
    }

    return lines.join('\n') + '\n';
  }

  public clear(): void {
    this.metrics.clear();
  }
}

export const neuroMetrics = NeuroMetricsExporter.getInstance();
