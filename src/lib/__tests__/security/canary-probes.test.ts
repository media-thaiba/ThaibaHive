/**
 * Unit Tests for CanaryProbeCollector & SyntheticProbeRunner
 * Sprint-038 / AGS-009
 */

import { CanaryProbeCollector } from "../../security/canary-probes";
import { SyntheticProbeRunner } from "../../security/synthetic-runner";

describe("Canary Probes Subsystem (AGS-009)", () => {
  let collector: CanaryProbeCollector;

  beforeEach(() => {
    collector = new CanaryProbeCollector();
    collector.reset();
  });

  it("should calculate p50, p95, p99 latencies and error rate accurately", () => {
    const now = 1_000_000;

    // Record 100 probes with varying latencies
    for (let i = 1; i <= 100; i++) {
      collector.recordProbe({
        route: "/api/health",
        durationMs: i, // 1ms to 100ms
        statusCode: i === 100 ? 500 : 200, // 1% error
        timestamp: now,
        success: i !== 100,
      });
    }

    const summary = collector.getSummary(60_000, now);
    expect(summary.totalProbes).toBe(100);
    expect(summary.p50LatencyMs).toBe(51);
    expect(summary.p95LatencyMs).toBe(96);
    expect(summary.p99LatencyMs).toBe(100);
    expect(summary.errorRate).toBe(0.01);
    expect(summary.healthy).toBe(true);
  });

  it("should mark health as false when error rate exceeds threshold", () => {
    const now = 1_000_000;
    collector.recordProbe({
      route: "/api/health",
      durationMs: 10,
      statusCode: 500,
      timestamp: now,
      success: false,
    });
    collector.recordProbe({
      route: "/api/health",
      durationMs: 10,
      statusCode: 200,
      timestamp: now,
      success: true,
    });

    const summary = collector.getSummary(60_000, now);
    expect(summary.errorRate).toBe(0.5); // 50% error
    expect(summary.healthy).toBe(false);
  });

  it("should execute synthetic probes with custom executor", async () => {
    const mockExecutor = jest.fn().mockResolvedValue({ statusCode: 200, durationMs: 12 });
    const runner = new SyntheticProbeRunner(collector, mockExecutor);

    const result = await runner.executeSingleProbe("/api/test");
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.durationMs).toBe(12);

    const all = await runner.executeAllProbes();
    expect(all.length).toBe(3);
  });
});
