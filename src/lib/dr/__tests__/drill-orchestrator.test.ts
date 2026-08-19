/**
 * Disaster Recovery Drill Orchestrator Unit Tests
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { DrillOrchestrator } from "../drill-orchestrator";
import { DrillMetricsAnalyzer } from "../drill-metrics";
import { FailoverDetector, FailoverCircuitState } from "@/lib/db/failover-detector";

describe("DrillOrchestrator & MetricsAnalyzer", () => {
  let orchestrator: DrillOrchestrator;

  beforeEach(async () => {
    orchestrator = DrillOrchestrator.getInstance();
    await orchestrator.abortDrill();
  });

  afterEach(async () => {
    await orchestrator.abortDrill();
  });

  it("should return initial idle status", () => {
    const status = orchestrator.getStatus();
    expect(status.status).toBeDefined();
    expect(status.activeFaults).toEqual([]);
  });

  it("should execute PRIMARY_OUTAGE drill scenario successfully", async () => {
    const result = await orchestrator.runDrill("PRIMARY_OUTAGE");

    expect(result.drillId).toMatch(/^drill_primary_outage_/);
    expect(result.scenario).toBe("PRIMARY_OUTAGE");
    expect(result.status).toBe("COMPLETED");
    expect(result.stepsExecuted.length).toBeGreaterThanOrEqual(4);
    expect(result.rpoLostTransactions).toBe(0);
    expect(result.slaPassed).toBe(true);

    const history = orchestrator.getHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].drillId).toBe(result.drillId);

    // Failover circuit should be restored to CLOSED
    expect(FailoverDetector.getInstance().getState()).toBe(FailoverCircuitState.CLOSED);
  });

  it("should execute REGIONAL_PARTITION and CACHE_DESYNC scenarios", async () => {
    const resRegion = await orchestrator.runDrill("REGIONAL_PARTITION");
    expect(resRegion.status).toBe("COMPLETED");
    expect(resRegion.slaPassed).toBe(true);

    const resCache = await orchestrator.runDrill("CACHE_DESYNC");
    expect(resCache.status).toBe("COMPLETED");
    expect(resCache.slaPassed).toBe(true);
  });

  it("should analyze drill metrics correctly against enterprise SLA", () => {
    const mockSuccess = {
      drillId: "drill-001",
      scenario: "PRIMARY_OUTAGE" as const,
      status: "COMPLETED" as const,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 8500,
      mttrMs: 7200,
      rpoLostTransactions: 0,
      parityVerified: true,
      slaPassed: true,
      stepsExecuted: [
        { stepName: "Step 1", durationMs: 100, success: true },
        { stepName: "Step 2", durationMs: 200, success: true },
      ],
    };

    const analysis = DrillMetricsAnalyzer.analyze(mockSuccess);
    expect(analysis.mttrPassed).toBe(true);
    expect(analysis.rpoPassed).toBe(true);
    expect(analysis.overallPassed).toBe(true);
    expect(analysis.mttrSeconds).toBe(7.2);

    const mockFailure = {
      ...mockSuccess,
      mttrMs: 45000, // Exceeds 30s SLA
      rpoLostTransactions: 2,
    };

    const failAnalysis = DrillMetricsAnalyzer.analyze(mockFailure);
    expect(failAnalysis.mttrPassed).toBe(false);
    expect(failAnalysis.rpoPassed).toBe(false);
    expect(failAnalysis.overallPassed).toBe(false);
    expect(failAnalysis.recommendations.length).toBeGreaterThanOrEqual(2);
  });
});
