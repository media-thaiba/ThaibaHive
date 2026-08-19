// ─── Identity Security Prometheus Metrics ────────────────────────────────────

const dpopValidationMs: number[] = [];
let dpopReplayRejected = 0;
const riskScoreDistribution: number[] = [];
let stepupTriggered = 0;
let stepupCompleted = 0;
let fingerprintDriftTotal = 0;

export function recordDPoPValidation(ms: number): void {
  dpopValidationMs.push(ms);
  if (dpopValidationMs.length > 10_000) dpopValidationMs.shift();
}

export function incrementReplayRejected(): void {
  dpopReplayRejected++;
}

export function recordRiskScore(score: number): void {
  riskScoreDistribution.push(score);
  if (riskScoreDistribution.length > 10_000) riskScoreDistribution.shift();
}

export function incrementStepupTriggered(): void {
  stepupTriggered++;
}

export function incrementStepupCompleted(): void {
  stepupCompleted++;
}

export function incrementFingerprintDrift(): void {
  fingerprintDriftTotal++;
}

/** Returns Prometheus OpenMetrics text for identity security metrics. */
export function getIdentityMetricsText(): string {
  const lines: string[] = [];

  const dpopP95 = computeP95(dpopValidationMs);
  lines.push("# HELP identity_dpop_validation_ms DPoP proof validation latency in milliseconds.");
  lines.push("# TYPE identity_dpop_validation_ms summary");
  lines.push(`identity_dpop_validation_ms{quantile="0.95"} ${dpopP95.toFixed(2)}`);
  lines.push(`identity_dpop_validation_ms_count ${dpopValidationMs.length}`);

  lines.push("# HELP identity_dpop_replay_rejected_total Total DPoP proof replay attempts rejected.");
  lines.push("# TYPE identity_dpop_replay_rejected_total counter");
  lines.push(`identity_dpop_replay_rejected_total ${dpopReplayRejected}`);

  const riskP50 = computePercentile(riskScoreDistribution, 0.5);
  const riskP95 = computeP95(riskScoreDistribution);
  lines.push("# HELP identity_risk_score_distribution Risk score distribution per authentication event.");
  lines.push("# TYPE identity_risk_score_distribution summary");
  lines.push(`identity_risk_score_distribution{quantile="0.5"} ${riskP50.toFixed(2)}`);
  lines.push(`identity_risk_score_distribution{quantile="0.95"} ${riskP95.toFixed(2)}`);
  lines.push(`identity_risk_score_distribution_count ${riskScoreDistribution.length}`);

  lines.push("# HELP identity_stepup_triggered_total Total step-up authentication challenges triggered.");
  lines.push("# TYPE identity_stepup_triggered_total counter");
  lines.push(`identity_stepup_triggered_total ${stepupTriggered}`);

  lines.push("# HELP identity_stepup_completed_total Total step-up authentication challenges completed successfully.");
  lines.push("# TYPE identity_stepup_completed_total counter");
  lines.push(`identity_stepup_completed_total ${stepupCompleted}`);

  lines.push("# HELP identity_device_fingerprint_drift_total Total device fingerprint drift events detected.");
  lines.push("# TYPE identity_device_fingerprint_drift_total counter");
  lines.push(`identity_device_fingerprint_drift_total ${fingerprintDriftTotal}`);

  return lines.join("\n");
}

function computeP95(values: number[]): number {
  return computePercentile(values, 0.95);
}

function computePercentile(values: number[], quantile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * quantile) - 1;
  return sorted[Math.max(0, idx)];
}
