// ─── Revocation Mesh Prometheus Metrics ──────────────────────────────────────
// Follows the same in-memory counter/gauge pattern as the existing
// observability infrastructure (prometheus-exporter.ts).

const propagationMs: number[] = [];
let bloomSizeBytes = 0;
let fallbackTotal = 0;
let activeSessionsTotal = 0;

export function recordRevocationPropagation(ms: number): void {
  propagationMs.push(ms);
  if (propagationMs.length > 10_000) propagationMs.shift();
}

export function incrementFallback(): void {
  fallbackTotal++;
}

export function updateBloomSize(bytes: number): void {
  bloomSizeBytes = bytes;
}

export function updateActiveSessions(n: number): void {
  activeSessionsTotal = n;
}

/** Returns Prometheus OpenMetrics text for revocation mesh metrics. */
export function getRevocationMetricsText(): string {
  const lines: string[] = [];

  const p95 = computeP95(propagationMs);
  lines.push("# HELP identity_revocation_propagation_ms Revocation propagation latency in milliseconds.");
  lines.push("# TYPE identity_revocation_propagation_ms summary");
  lines.push(`identity_revocation_propagation_ms{quantile="0.95"} ${p95.toFixed(2)}`);
  lines.push(`identity_revocation_propagation_ms_count ${propagationMs.length}`);

  lines.push("# HELP identity_revocation_bloom_size Approximate size of the revocation bloom filter in bytes.");
  lines.push("# TYPE identity_revocation_bloom_size gauge");
  lines.push(`identity_revocation_bloom_size ${bloomSizeBytes}`);

  lines.push("# HELP identity_revocation_fallback_total Total revocations that fell back to central store.");
  lines.push("# TYPE identity_revocation_fallback_total counter");
  lines.push(`identity_revocation_fallback_total ${fallbackTotal}`);

  lines.push("# HELP identity_active_sessions_total Total number of active sessions.");
  lines.push("# TYPE identity_active_sessions_total gauge");
  lines.push(`identity_active_sessions_total ${activeSessionsTotal}`);

  return lines.join("\n");
}

function computeP95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}
