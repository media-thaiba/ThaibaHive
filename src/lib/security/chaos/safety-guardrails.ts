/**
 * Chaos Safety Guardrails & Health Monitor
 * Sprint-042 (ARES) — ARES-008
 */

export interface SystemHealthMetrics {
  errorRatePercent: number;
  p99LatencyMs: number;
  unhandledExceptionCount: number;
  activeRequests: number;
}

export interface GuardrailCheckResult {
  isSafe: boolean;
  breachReason?: string;
  metrics: SystemHealthMetrics;
}

export class SafetyGuardrails {
  private static instance: SafetyGuardrails | null = null;
  private maxAllowedErrorRatePercent = 1.0;
  private maxAllowedP99LatencyMs = 1000;
  private maxAllowedUnhandledExceptions = 5;

  private constructor() {}

  public static getInstance(): SafetyGuardrails {
    if (!SafetyGuardrails.instance) {
      SafetyGuardrails.instance = new SafetyGuardrails();
    }
    return SafetyGuardrails.instance;
  }

  public checkHealth(metrics: SystemHealthMetrics): GuardrailCheckResult {
    if (metrics.errorRatePercent > this.maxAllowedErrorRatePercent) {
      return {
        isSafe: false,
        breachReason: `Error rate (${metrics.errorRatePercent.toFixed(2)}%) exceeded threshold (${this.maxAllowedErrorRatePercent}%)`,
        metrics,
      };
    }

    if (metrics.p99LatencyMs > this.maxAllowedP99LatencyMs) {
      return {
        isSafe: false,
        breachReason: `P99 Latency (${metrics.p99LatencyMs}ms) exceeded threshold (${this.maxAllowedP99LatencyMs}ms)`,
        metrics,
      };
    }

    if (metrics.unhandledExceptionCount > this.maxAllowedUnhandledExceptions) {
      return {
        isSafe: false,
        breachReason: `Unhandled exceptions (${metrics.unhandledExceptionCount}) exceeded threshold (${this.maxAllowedUnhandledExceptions})`,
        metrics,
      };
    }

    return {
      isSafe: true,
      metrics,
    };
  }

  public setThresholds(thresholds: {
    maxErrorRatePercent?: number;
    maxP99LatencyMs?: number;
    maxUnhandledExceptions?: number;
  }): void {
    if (thresholds.maxErrorRatePercent !== undefined) this.maxAllowedErrorRatePercent = thresholds.maxErrorRatePercent;
    if (thresholds.maxP99LatencyMs !== undefined) this.maxAllowedP99LatencyMs = thresholds.maxP99LatencyMs;
    if (thresholds.maxUnhandledExceptions !== undefined)
      this.maxAllowedUnhandledExceptions = thresholds.maxUnhandledExceptions;
  }
}
