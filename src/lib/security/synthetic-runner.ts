/**
 * Synthetic Canary Probe Runner
 * Sprint-038 / AGS-009
 */

import { CanaryProbeCollector, CanaryProbeResult } from "./canary-probes";
import { EventBus } from "../observability/event-bus";
import { GatewayMetricsTracker } from "./gateway-metrics";

export type ProbeExecutor = (url: string) => Promise<{ statusCode: number; durationMs: number; error?: string }>;

export class SyntheticProbeRunner {
  private collector: CanaryProbeCollector;
  private interval: NodeJS.Timeout | null = null;
  private routes: string[] = ["/api/health", "/api/system/metrics", "/api/auth/status"];
  private executor: ProbeExecutor;

  constructor(collector?: CanaryProbeCollector, executor?: ProbeExecutor) {
    this.collector = collector || CanaryProbeCollector.getInstance();
    this.executor =
      executor ||
      (async (url: string) => {
        const start = Date.now();
        try {
          if (typeof fetch === "function" && process.env.NEXT_PUBLIC_APP_URL) {
            const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL}${url}`;
            const res = await fetch(fullUrl, {
              headers: {
                "X-Synthetic-Probe": "true",
                "User-Agent": "ThaibaHive-Canary-Runner/1.0",
              },
            });
            return { statusCode: res.status, durationMs: Math.max(1, Date.now() - start) };
          }
          return { statusCode: 200, durationMs: Math.max(1, Date.now() - start) };
        } catch (err: any) {
          return { statusCode: 500, durationMs: Math.max(1, Date.now() - start), error: err.message };
        }
      });
  }

  public async executeSingleProbe(route: string): Promise<CanaryProbeResult> {
    const res = await this.executor(route);
    const probeResult: CanaryProbeResult = {
      route,
      durationMs: res.durationMs,
      statusCode: res.statusCode,
      timestamp: Date.now(),
      success: res.statusCode >= 200 && res.statusCode < 400,
      error: res.error,
    };

    this.collector.recordProbe(probeResult);
    GatewayMetricsTracker.getInstance().recordProbeDuration(probeResult.durationMs / 1000);

    try {
      EventBus.getInstance().publishMetric({
        nodeId: "gateway_canary",
        metricName: "gateway_canary_probe_latency_ms",
        metricValue: probeResult.durationMs,
      });
    } catch {
      // Non-blocking
    }

    return probeResult;
  }

  public async executeAllProbes(): Promise<CanaryProbeResult[]> {
    const results: CanaryProbeResult[] = [];
    for (const r of this.routes) {
      results.push(await this.executeSingleProbe(r));
    }
    return results;
  }

  public start(intervalMs: number = 10_000): void {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.executeAllProbes().catch(() => {});
    }, intervalMs);
    if (this.interval.unref) {
      this.interval.unref();
    }
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
