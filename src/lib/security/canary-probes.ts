/**
 * Synthetic Canary Health Probes
 * Sprint-038 / AGS-009
 */

export interface CanaryProbeResult {
  route: string;
  durationMs: number;
  statusCode: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface CanaryHealthSummary {
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number; // 0.0 - 1.0
  totalProbes: number;
  healthy: boolean;
  lastProbeTimestamp: number;
}

export class CanaryProbeCollector {
  private static instance: CanaryProbeCollector | null = null;
  private results: CanaryProbeResult[] = [];
  private readonly MAX_HISTORY = 500;

  public static getInstance(): CanaryProbeCollector {
    if (!CanaryProbeCollector.instance) {
      CanaryProbeCollector.instance = new CanaryProbeCollector();
    }
    return CanaryProbeCollector.instance;
  }

  public recordProbe(result: CanaryProbeResult): void {
    this.results.push(result);
    if (this.results.length > this.MAX_HISTORY) {
      this.results.shift();
    }
  }

  public getSummary(windowMs: number = 60_000, nowMs: number = Date.now()): CanaryHealthSummary {
    const cutoff = nowMs - windowMs;
    const recent = this.results.filter((r) => r.timestamp > cutoff);

    if (recent.length === 0) {
      return {
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        errorRate: 0,
        totalProbes: 0,
        healthy: true,
        lastProbeTimestamp: nowMs,
      };
    }

    const latencies = recent.map((r) => r.durationMs).sort((a, b) => a - b);
    const errors = recent.filter((r) => !r.success || r.statusCode >= 500);

    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const errorRate = errors.length / recent.length;

    // Healthy if p95 < 100ms and errorRate < 5%
    const healthy = p95 < 100 && errorRate < 0.05;

    return {
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      errorRate,
      totalProbes: recent.length,
      healthy,
      lastProbeTimestamp: recent[recent.length - 1].timestamp,
    };
  }

  public reset(): void {
    this.results = [];
  }
}
