#!/usr/bin/env tsx
/**
 * Disaster Recovery Drill CLI Runner
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { DrillOrchestrator } from "../../src/lib/dr/drill-orchestrator";
import { DrillMetricsAnalyzer, type MetricAnalysisReport } from "../../src/lib/dr/drill-metrics";
import { DrillScenarioType, type DrillExecutionResult } from "../../src/lib/dr/types";
import { writeJsonReport } from "../lib/reports-path";

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isJson = args.includes("--json");

  let scenario: DrillScenarioType = "PRIMARY_OUTAGE";
  const scenarioArg = args.find((a) => a.startsWith("--scenario="));
  if (scenarioArg) {
    const rawScenario = scenarioArg.split("=")[1].toUpperCase();
    if (rawScenario === "PRIMARY-OUTAGE" || rawScenario === "PRIMARY_OUTAGE") {
      scenario = "PRIMARY_OUTAGE";
    } else if (rawScenario === "REGIONAL-PARTITION" || rawScenario === "REGIONAL_PARTITION") {
      scenario = "REGIONAL_PARTITION";
    } else if (rawScenario === "CACHE-DESYNC" || rawScenario === "CACHE_DESYNC") {
      scenario = "CACHE_DESYNC";
    } else if (rawScenario === "MULTI-TENANT" || rawScenario === "MULTI_TENANT_ISOLATION_DRILL") {
      scenario = "MULTI_TENANT_ISOLATION_DRILL";
    }
  }

  if (!isJson) {
    console.log("================================================================================");
    console.log("        THAIBAHIVE DISASTER RECOVERY DRILL HARNESS (SPRINT-035)        ");
    console.log("================================================================================");
    console.log(`Scenario: ${scenario}`);
    console.log(`Dry Run : ${isDryRun ? "YES (Simulation Only)" : "NO (Live Execution)"}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);
  }

  if (isDryRun) {
    const mockResult = {
      drillId: `dryrun_${scenario.toLowerCase()}_${Date.now()}`,
      scenario,
      status: "COMPLETED" as const,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 1450,
      mttrMs: 1250,
      rpoLostTransactions: 0,
      parityVerified: true,
      slaPassed: true,
      stepsExecuted: [
        { stepName: "Pre-drill Cluster Health Check", durationMs: 45, success: true },
        { stepName: `Simulate ${scenario}`, durationMs: 120, success: true },
        { stepName: "Simulate Failover & Recovery", durationMs: 1050, success: true },
      ],
    };

    const analysis = DrillMetricsAnalyzer.analyze(mockResult);

    if (isJson) {
      console.log(JSON.stringify({ result: mockResult, analysis }, null, 2));
    } else {
      console.log(`✅ [DRY RUN] Drill ${mockResult.drillId} completed successfully.`);
      console.log(`   MTTR: ${analysis.mttrSeconds}s (Target: < 30.0s) [${analysis.mttrPassed ? "PASS" : "FAIL"}]`);
      console.log(`   RPO : ${analysis.rpoLostTransactions} lost transactions [${analysis.rpoPassed ? "PASS" : "FAIL"}]`);
      console.log(`   SLA : ${analysis.overallPassed ? "PASSED" : "FAILED"}\n`);
    }

    saveReport(mockResult, analysis);
    process.exit(0);
  }

  // Live drill execution
  process.env.DR_CHAOS_ENABLED = "true";
  const orchestrator = DrillOrchestrator.getInstance();

  try {
    const result = await orchestrator.runDrill(scenario);
    const analysis = DrillMetricsAnalyzer.analyze(result);

    if (isJson) {
      console.log(JSON.stringify({ result, analysis }, null, 2));
    } else {
      console.log(`Status  : ${result.status}`);
      console.log(`Duration: ${(result.durationMs! / 1000).toFixed(2)}s`);
      console.log(`MTTR    : ${analysis.mttrSeconds}s (SLA: < 30s) -> ${analysis.mttrPassed ? "✅ PASS" : "❌ FAIL"}`);
      console.log(`RPO     : ${analysis.rpoLostTransactions} tx lost (SLA: 0) -> ${analysis.rpoPassed ? "✅ PASS" : "❌ FAIL"}`);
      console.log(`Steps   : ${analysis.stepSuccessCount}/${analysis.totalSteps} passed -> ${analysis.stepsPassed ? "✅ PASS" : "❌ FAIL"}`);
      console.log("\nExecuted Steps:");
      result.stepsExecuted.forEach((step, idx) => {
        console.log(`  ${idx + 1}. [${step.success ? "OK" : "FAILED"}] ${step.stepName} (${step.durationMs}ms)`);
      });

      console.log("\nRecommendations:");
      analysis.recommendations.forEach((rec) => console.log(`  - ${rec}`));
    }

    saveReport(result, analysis);

    if (!analysis.overallPassed) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err: unknown) {
    console.error("❌ Fatal error executing DR drill:", err);
    process.exit(1);
  }
}

function saveReport(result: DrillExecutionResult, analysis: MetricAnalysisReport) {
  writeJsonReport("dr-drill-report.json", {
    result,
    analysis,
    generatedAt: new Date().toISOString(),
  });
}

main();
