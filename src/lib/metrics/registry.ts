/**
 * ThaibaHive AIOS — Prometheus OpenMetrics Registry
 *
 * Central metric registry. All subsystems register their Prometheus series here
 * using the PrometheusMetric interface so that /api/metrics can scrape them
 * in a single Prometheus text exposition format pass.
 *
 * Sprint-044 AFED-024: adds 8 new series for federated learning telemetry.
 */

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface LabelSet {
  [key: string]: string;
}

export interface MetricSample {
  name: string;
  labels: LabelSet;
  value: number;
  timestampMs?: number;
}

export interface PrometheusMetric {
  name: string;
  help: string;
  type: MetricType;
  labelNames: string[];
}

// ─── In-Process Value Store ───────────────────────────────────────────────────
const counters = new Map<string, number>();
const gauges = new Map<string, number>();
const histogramBuckets = new Map<string, number[]>();

// ─── Registered Metric Descriptors ────────────────────────────────────────────
const registeredMetrics: Map<string, PrometheusMetric> = new Map();

export function registerMetric(metric: PrometheusMetric): void {
  registeredMetrics.set(metric.name, metric);
}

export function getAllMetrics(): PrometheusMetric[] {
  return Array.from(registeredMetrics.values());
}

// ─── Counter Operations ───────────────────────────────────────────────────────
export function incrementCounter(name: string, by: number = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

export function getCounter(name: string): number {
  return counters.get(name) ?? 0;
}

// ─── Gauge Operations ─────────────────────────────────────────────────────────
export function setGauge(name: string, value: number): void {
  gauges.set(name, value);
}

export function getGauge(name: string): number {
  return gauges.get(name) ?? 0;
}

// ─── Histogram Operations ─────────────────────────────────────────────────────
export function observeHistogram(name: string, value: number): void {
  if (!histogramBuckets.has(name)) histogramBuckets.set(name, []);
  histogramBuckets.get(name)!.push(value);
}

export function getHistogramPercentile(name: string, percentile: number): number {
  const vals = histogramBuckets.get(name);
  if (!vals || vals.length === 0) return 0;
  const sorted = [...vals].sort((a, b) => a - b);
  const idx = Math.floor((percentile / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// ─── Serialization ────────────────────────────────────────────────────────────
export function serializeToPrometheusText(): string {
  const lines: string[] = [];

  for (const metric of registeredMetrics.values()) {
    lines.push(`# HELP ${metric.name} ${metric.help}`);
    lines.push(`# TYPE ${metric.name} ${metric.type}`);

    if (metric.type === 'counter') {
      lines.push(`${metric.name} ${counters.get(metric.name) ?? 0}`);
    } else if (metric.type === 'gauge') {
      lines.push(`${metric.name} ${gauges.get(metric.name) ?? 0}`);
    } else if (metric.type === 'histogram') {
      const vals = histogramBuckets.get(metric.name) ?? [];
      const sum = vals.reduce((acc, v) => acc + v, 0);
      lines.push(`${metric.name}_count ${vals.length}`);
      lines.push(`${metric.name}_sum ${sum.toFixed(3)}`);
    }
  }

  return lines.join('\n') + '\n';
}

export function clearRegistry(): void {
  counters.clear();
  gauges.clear();
  histogramBuckets.clear();
}

// ─── AFED-024: Register 8 Federated Learning Prometheus Series ────────────────
registerMetric({
  name: 'afed_training_rounds_total',
  help: 'Counter of completed federated training rounds',
  type: 'counter',
  labelNames: ['model_id', 'algorithm'],
});

registerMetric({
  name: 'afed_training_loss',
  help: 'Current global federated model convergence loss (gauge)',
  type: 'gauge',
  labelNames: ['model_id'],
});

registerMetric({
  name: 'afed_privacy_epsilon_consumed',
  help: 'Accumulated differential privacy epsilon budget consumed',
  type: 'gauge',
  labelNames: ['tenant_id'],
});

registerMetric({
  name: 'afed_participating_nodes_active',
  help: 'Number of active campus edge nodes in the current federated round',
  type: 'gauge',
  labelNames: ['campus_id'],
});

registerMetric({
  name: 'afed_drift_psi_score',
  help: 'Population Stability Index score for demographic covariate shift monitoring',
  type: 'gauge',
  labelNames: ['model_id', 'feature_name'],
});

registerMetric({
  name: 'afed_edge_inference_duration_ms',
  help: 'Histogram of local edge inference latency in milliseconds',
  type: 'histogram',
  labelNames: ['model_id', 'execution_tier'],
});

registerMetric({
  name: 'afed_smpc_session_duration_ms',
  help: 'Histogram of cryptographic SMPC secure aggregation session duration in milliseconds',
  type: 'histogram',
  labelNames: ['session_id'],
});

registerMetric({
  name: 'afed_model_accuracy_ratio',
  help: 'Validated global model prediction accuracy ratio (0.0–1.0)',
  type: 'gauge',
  labelNames: ['model_id'],
});

// ─── Sprint-043 AIMS: legacy metrics (preserved) ─────────────────────────────
registerMetric({
  name: 'aims_agent_invocations_total',
  help: 'Counter of AIMS autonomous agent task invocations',
  type: 'counter',
  labelNames: ['agent_type'],
});

registerMetric({
  name: 'aims_energy_kwh_total',
  help: 'Total campus energy consumption tracked by AIMS in kWh',
  type: 'gauge',
  labelNames: ['campus_id'],
});
