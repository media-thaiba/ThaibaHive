/**
 * Disaster Recovery Drill Metrics Collector & RPO/MTTR Analyzer
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { DrillExecutionResult } from "./types";

export interface DrillSLARequirements {
  maxMttrMs: number; // SLA: 30000ms (30.0s)
  maxRpoLostTxCount: number; // SLA: 0
  minStepSuccessRatio: number; // SLA: 1.0 (100%)
  maxDrillDurationMs: number; // SLA: 600000ms (10 minutes)
}

export const DEFAULT_DR_SLA: DrillSLARequirements = {
  maxMttrMs: 30000,
  maxRpoLostTxCount: 0,
  minStepSuccessRatio: 1.0,
  maxDrillDurationMs: 600000,
};

export interface MetricAnalysisReport {
  drillId: string;
  scenario: string;
  mttrMs: number;
  mttrSeconds: number;
  mttrPassed: boolean;
  rpoLostTransactions: number;
  rpoPassed: boolean;
  stepSuccessCount: number;
  totalSteps: number;
  stepSuccessRatio: number;
  stepsPassed: boolean;
  overallPassed: boolean;
  recommendations: string[];
}

export class DrillMetricsAnalyzer {
  public static analyze(
    result: DrillExecutionResult,
    sla: DrillSLARequirements = DEFAULT_DR_SLA
  ): MetricAnalysisReport {
    const mttrMs = result.mttrMs ?? result.durationMs ?? 0;
    const mttrSeconds = Number((mttrMs / 1000).toFixed(2));
    const mttrPassed = mttrMs <= sla.maxMttrMs;

    const rpoLostTransactions = result.rpoLostTransactions;
    const rpoPassed = rpoLostTransactions <= sla.maxRpoLostTxCount;

    const totalSteps = result.stepsExecuted.length;
    const stepSuccessCount = result.stepsExecuted.filter((s) => s.success).length;
    const stepSuccessRatio = totalSteps > 0 ? stepSuccessCount / totalSteps : 0;
    const stepsPassed = stepSuccessRatio >= sla.minStepSuccessRatio;

    const overallPassed = result.status === "COMPLETED" && mttrPassed && rpoPassed && stepsPassed;

    const recommendations: string[] = [];
    if (!mttrPassed) {
      recommendations.push(
        `MTTR of ${mttrSeconds}s exceeded enterprise SLA target of ${sla.maxMttrMs / 1000}s. Optimize probe intervals or replica election ranking.`
      );
    }
    if (!rpoPassed) {
      recommendations.push(
        `RPO violation: ${rpoLostTransactions} canary transactions lost. Check synchronous replication and WAL spooling.`
      );
    }
    if (!stepsPassed) {
      recommendations.push(
        `${totalSteps - stepSuccessCount} drill steps failed during scenario execution. Review individual step logs.`
      );
    }
    if (overallPassed) {
      recommendations.push(
        `All DR SLAs satisfied: Zero data loss (RPO = 0s) and recovery completed in ${mttrSeconds}s (MTTR < 30s).`
      );
    }

    return {
      drillId: result.drillId,
      scenario: result.scenario,
      mttrMs,
      mttrSeconds,
      mttrPassed,
      rpoLostTransactions,
      rpoPassed,
      stepSuccessCount,
      totalSteps,
      stepSuccessRatio,
      stepsPassed,
      overallPassed,
      recommendations,
    };
  }
}
