import { evaluateCanaryPromotion, dispatchAlertWebhook } from "../canary-promotion-gate";
import type { SmokeSummaryReport } from "../staging-smoke-runner";

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe("CNR-003: Canary Promotion Gate Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseReport: SmokeSummaryReport = {
    timestamp: "2026-08-19T10:00:00.000Z",
    baseUrl: "http://staging.thaibahive.local",
    durationMs: 450,
    totalChecks: 5,
    passedChecks: 5,
    failedChecks: 0,
    allPassed: true,
    results: [
      { suite: "Health & DB", name: "Health Endpoint", passed: true, durationMs: 20 },
      { suite: "Health & DB", name: "Database Migration Schema Parity", passed: true, durationMs: 5 },
      {
        suite: "APM & Latency",
        name: "Metrics Endpoint JSON Schema",
        passed: true,
        durationMs: 25,
        details: { errorRate: 0.0 },
      },
      { suite: "APM & Latency", name: "Global p95 Latency Baseline", passed: true, durationMs: 150 },
    ],
  };

  test("allows promotion when all checks pass, 0% errors, 0 pending migrations, and p95 latency is within baseline", () => {
    const decision = evaluateCanaryPromotion(baseReport, 200);
    expect(decision.allowed).toBe(true);
    expect(decision.reasons.length).toBe(0);
    expect(decision.metrics.stagingP95Ms).toBe(150);
    expect(decision.metrics.migrationIntegrityVerified).toBe(true);
  });

  test("blocks promotion when smoke test contains failed checks", () => {
    const failingReport: SmokeSummaryReport = {
      ...baseReport,
      allPassed: false,
      failedChecks: 1,
      passedChecks: 4,
      results: [
        ...baseReport.results,
        { suite: "Auth & APIs", name: "Student Query", passed: false, durationMs: 50, error: "500 Internal Error" },
      ],
    };

    const decision = evaluateCanaryPromotion(failingReport, 200);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.some((r) => r.includes("Smoke test failure"))).toBe(true);
  });

  test("blocks promotion when database migration check failed", () => {
    const migrationFailReport: SmokeSummaryReport = {
      ...baseReport,
      results: [
        {
          suite: "Health & DB",
          name: "Database Migration Schema Parity",
          passed: false,
          durationMs: 5,
          error: "Missing migration file: 0024_pending.sql",
        },
      ],
    };

    const decision = evaluateCanaryPromotion(migrationFailReport, 200);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.some((r) => r.includes("Database migration integrity failure"))).toBe(true);
  });

  test("blocks promotion when staging error rate is above 0.00%", () => {
    const errorReport: SmokeSummaryReport = {
      ...baseReport,
      results: [
        {
          suite: "APM & Latency",
          name: "Metrics Endpoint JSON Schema",
          passed: true,
          durationMs: 25,
          details: { errorRate: 0.5 },
        },
      ],
    };

    const decision = evaluateCanaryPromotion(errorReport, 200);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.some((r) => r.includes("Staging error rate is 0.5%"))).toBe(true);
  });

  test("blocks promotion when p95 latency regresses by > 20% over baseline", () => {
    const regressedReport: SmokeSummaryReport = {
      ...baseReport,
      results: [
        { suite: "APM & Latency", name: "Global p95 Latency Baseline", passed: true, durationMs: 320 },
      ],
    };

    // Baseline: 200ms, Staging: 320ms (+60% regression)
    const decision = evaluateCanaryPromotion(regressedReport, 200);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.some((r) => r.includes("Latency regression detected"))).toBe(true);
    expect(decision.metrics.latencyDeltaPct).toBe(60);
  });

  test("dispatchAlertWebhook sends structured alert payload", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const decision = evaluateCanaryPromotion(
      { ...baseReport, allPassed: false, failedChecks: 1 },
      200
    );

    const dispatched = await dispatchAlertWebhook("https://hooks.slack.com/services/mock", decision, baseReport);
    expect(dispatched).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/mock",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });
});
