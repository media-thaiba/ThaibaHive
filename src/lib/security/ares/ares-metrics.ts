/**
 * ARES Prometheus OpenMetrics Telemetry Tracker
 * Sprint-042 (ARES) — ARES-019
 */

export class AresMetricsTracker {
  private static instance: AresMetricsTracker;

  private threatProbabilities = new Map<string, number>();
  private activeChaosExperiments = new Map<string, number>();
  private circuitBreakerTrips = new Map<string, number>();
  private zkpDurations: number[] = [];
  private graphNodesCount = new Map<string, number>();
  private resilienceScores = new Map<string, number>();

  private readonly HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 5.0];

  private constructor() {}

  public static getInstance(): AresMetricsTracker {
    if (!AresMetricsTracker.instance) {
      AresMetricsTracker.instance = new AresMetricsTracker();
    }
    return AresMetricsTracker.instance;
  }

  public static resetInstance(): void {
    AresMetricsTracker.instance = new AresMetricsTracker();
  }

  public recordThreatProbability(category: string, severity: string, probability: number): void {
    const key = `category="${category}",severity="${severity}"`;
    this.threatProbabilities.set(key, probability);
  }

  public setActiveChaosExperiments(status: string, count: number): void {
    const key = `status="${status}"`;
    this.activeChaosExperiments.set(key, count);
  }

  public recordCircuitBreakerTrip(reason: string): void {
    const key = `reason="${reason.replace(/"/g, '')}"`;
    this.circuitBreakerTrips.set(key, (this.circuitBreakerTrips.get(key) || 0) + 1);
  }

  public recordZkpVerificationDuration(durationSeconds: number): void {
    this.zkpDurations.push(durationSeconds);
    if (this.zkpDurations.length > 500) {
      this.zkpDurations.shift();
    }
  }

  public setGraphNodes(type: string, count: number): void {
    const key = `type="${type}"`;
    this.graphNodesCount.set(key, count);
  }

  public setResilienceScore(vector: string, score: number): void {
    const key = `vector="${vector}"`;
    this.resilienceScores.set(key, score);
  }

  public toOpenMetrics(): string {
    const lines: string[] = [];

    // 1. ares_predictive_threat_probability
    lines.push('# HELP ares_predictive_threat_probability Bayesian posterior probability of emerging threats');
    lines.push('# TYPE ares_predictive_threat_probability gauge');
    for (const [labels, val] of this.threatProbabilities.entries()) {
      lines.push(`ares_predictive_threat_probability{${labels}} ${val.toFixed(4)}`);
    }

    // 2. ares_chaos_experiments_active
    lines.push('# HELP ares_chaos_experiments_active Number of active chaos experiments');
    lines.push('# TYPE ares_chaos_experiments_active gauge');
    for (const [labels, val] of this.activeChaosExperiments.entries()) {
      lines.push(`ares_chaos_experiments_active{${labels}} ${val}`);
    }

    // 3. ares_chaos_circuit_breaker_trips_total
    lines.push('# HELP ares_chaos_circuit_breaker_trips_total Total circuit breaker kill-switch trips');
    lines.push('# TYPE ares_chaos_circuit_breaker_trips_total counter');
    for (const [labels, val] of this.circuitBreakerTrips.entries()) {
      lines.push(`ares_chaos_circuit_breaker_trips_total{${labels}} ${val}`);
    }

    // 4. ares_zkp_verification_duration_seconds
    lines.push('# HELP ares_zkp_verification_duration_seconds Histogram of ZKP verification duration');
    lines.push('# TYPE ares_zkp_verification_duration_seconds histogram');
    const zkpCount = this.zkpDurations.length;
    const zkpSum = this.zkpDurations.reduce((a, b) => a + b, 0);

    for (const le of this.HISTOGRAM_BUCKETS) {
      const bucketCount = this.zkpDurations.filter((d) => d <= le).length;
      lines.push(`ares_zkp_verification_duration_seconds_bucket{le="${le}"} ${bucketCount}`);
    }
    lines.push(`ares_zkp_verification_duration_seconds_bucket{le="+Inf"} ${zkpCount}`);
    lines.push(`ares_zkp_verification_duration_seconds_sum ${zkpSum.toFixed(4)}`);
    lines.push(`ares_zkp_verification_duration_seconds_count ${zkpCount}`);

    // 5. ares_threat_graph_nodes_total
    lines.push('# HELP ares_threat_graph_nodes_total Count of nodes in live threat intelligence graph');
    lines.push('# TYPE ares_threat_graph_nodes_total gauge');
    for (const [labels, val] of this.graphNodesCount.entries()) {
      lines.push(`ares_threat_graph_nodes_total{${labels}} ${val}`);
    }

    // 6. ares_resilience_score
    lines.push('# HELP ares_resilience_score Current quantified resilience score');
    lines.push('# TYPE ares_resilience_score gauge');
    for (const [labels, val] of this.resilienceScores.entries()) {
      lines.push(`ares_resilience_score{${labels}} ${val.toFixed(1)}`);
    }

    return lines.join('\n');
  }
}

export const aresMetricsTracker = AresMetricsTracker.getInstance();
