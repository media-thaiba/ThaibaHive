import { evaluateDependencyCanary } from "../dependency-canary-evaluator";

describe("DependencyCanaryEvaluator", () => {
  test("authorizes auto-merge when all canary gates pass", () => {
    const evaluation = evaluateDependencyCanary({
      smokeTestsPassed: true,
      smokeTestsTotal: 8,
      smokeTestsFailed: 0,
      stagingP95LatencyMs: 145,
      baselineP95LatencyMs: 140, // +3.5% delta
      errorRatePercent: 0.0,
      pendingMigrationsCount: 0,
    });

    expect(evaluation.passed).toBe(true);
    expect(evaluation.canAutoMerge).toBe(true);
    expect(evaluation.metrics.latencyDeltaPercent).toBe(3.57);
  });

  test("blocks auto-merge when smoke tests fail", () => {
    const evaluation = evaluateDependencyCanary({
      smokeTestsPassed: false,
      smokeTestsTotal: 8,
      smokeTestsFailed: 1,
      stagingP95LatencyMs: 140,
      baselineP95LatencyMs: 140,
      errorRatePercent: 0.0,
      pendingMigrationsCount: 0,
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.canAutoMerge).toBe(false);
    expect(evaluation.reasons[0]).toContain("Staging smoke tests failed");
  });

  test("blocks auto-merge when latency regression exceeds +5.0%", () => {
    const evaluation = evaluateDependencyCanary({
      smokeTestsPassed: true,
      smokeTestsTotal: 8,
      smokeTestsFailed: 0,
      stagingP95LatencyMs: 160,
      baselineP95LatencyMs: 140, // +14.2% regression
      errorRatePercent: 0.0,
      pendingMigrationsCount: 0,
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.canAutoMerge).toBe(false);
    expect(evaluation.reasons[0]).toContain("latency regression detected");
  });

  test("blocks auto-merge when error rate > 0%", () => {
    const evaluation = evaluateDependencyCanary({
      smokeTestsPassed: true,
      smokeTestsTotal: 8,
      smokeTestsFailed: 0,
      stagingP95LatencyMs: 140,
      baselineP95LatencyMs: 140,
      errorRatePercent: 0.5,
      pendingMigrationsCount: 0,
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.canAutoMerge).toBe(false);
    expect(evaluation.reasons[0]).toContain("Canary error rate exceeded");
  });
});
