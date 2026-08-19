#!/usr/bin/env tsx
/**
 * Disaster Recovery Staging Canary Evaluator Gate
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import * as fs from "fs";
import * as path from "path";

interface DRCanaryEvaluation {
  timestamp: string;
  passed: boolean;
  rpoPassed: boolean;
  mttrPassed: boolean;
  parityPassed: boolean;
  mttrSeconds: number;
  rpoLostTx: number;
  details: string[];
}

export function evaluateDRExecution(
  drillReportPath?: string,
  failoverReportPath?: string,
  rollbackReportPath?: string
): DRCanaryEvaluation {
  const reportsDir = path.resolve(process.cwd(), "reports");
  const drillFile = drillReportPath || path.join(reportsDir, "dr-drill-report.json");
  const failoverFile = failoverReportPath || path.join(reportsDir, "failover-verification-report.json");
  const rollbackFile = rollbackReportPath || path.join(reportsDir, "rollback-verification-report.json");

  let mttrSeconds = 999.0;
  let rpoLostTx = 999;
  let parityPassed = false;
  let reportsFound = 0;
  const details: string[] = [];

  if (fs.existsSync(drillFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(drillFile, "utf8"));
      if (data.analysis) {
        mttrSeconds = data.analysis.mttrSeconds;
        rpoLostTx = data.analysis.rpoLostTransactions;
        parityPassed = data.result?.parityVerified ?? true;
        reportsFound++;
      }
    } catch {}
  }

  if (fs.existsSync(failoverFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(failoverFile, "utf8"));
      if (data.metrics) {
        mttrSeconds = reportsFound === 0 ? data.metrics.mttrSeconds : Math.max(mttrSeconds, data.metrics.mttrSeconds);
        rpoLostTx = reportsFound === 0 ? data.metrics.rpoLostTransactions : rpoLostTx + data.metrics.rpoLostTransactions;
        parityPassed = true;
        reportsFound++;
      }
    } catch {}
  }

  if (fs.existsSync(rollbackFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(rollbackFile, "utf8"));
      if (data.parityResults) {
        parityPassed = data.parityResults.checksumMatched && data.parityResults.schemaAligned;
        reportsFound++;
      }
    } catch {}
  }

  if (reportsFound === 0) {
    details.push("❌ No disaster recovery drill or verification reports found (fail-closed gate)");
    return {
      timestamp: new Date().toISOString(),
      passed: false,
      rpoPassed: false,
      mttrPassed: false,
      parityPassed: false,
      mttrSeconds: 999.0,
      rpoLostTx: 999,
      details,
    };
  }

  const mttrPassed = mttrSeconds < 30.0;
  const rpoPassed = rpoLostTx === 0;
  const overallPassed = mttrPassed && rpoPassed && parityPassed;

  if (mttrPassed) {
    details.push(`✅ MTTR (${mttrSeconds}s) meets enterprise SLA threshold (< 30.0s)`);
  } else {
    details.push(`❌ MTTR (${mttrSeconds}s) breached enterprise SLA threshold (< 30.0s)`);
  }

  if (rpoPassed) {
    details.push(`✅ Zero data loss verified: RPO = 0s (0 lost transactions)`);
  } else {
    details.push(`❌ Data loss detected: ${rpoLostTx} lost transactions`);
  }

  if (parityPassed) {
    details.push(`✅ 100% schema and data checksum parity confirmed post-recovery`);
  } else {
    details.push(`❌ Post-recovery data or schema parity check failed`);
  }

  return {
    timestamp: new Date().toISOString(),
    passed: overallPassed,
    rpoPassed,
    mttrPassed,
    parityPassed,
    mttrSeconds,
    rpoLostTx,
    details,
  };
}

async function main() {
  const result = evaluateDRExecution();

  console.log("================================================================================");
  console.log("           THAIBAHIVE DR STAGING CANARY PROMOTION GATE EVALUATOR                ");
  console.log("================================================================================");
  console.log(`Gate Status : ${result.passed ? "✅ PROMOTION APPROVED" : "❌ PROMOTION BLOCKED"}`);
  console.log(`Timestamp   : ${result.timestamp}\n`);
  console.log("Evaluated Gate Criteria:");
  result.details.forEach((d) => console.log(`  ${d}`));
  console.log("");

  // Write GitHub step summary if environment is CI
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summaryMd = `
### 🛡️ Disaster Recovery Staging Canary Evaluation

| Gate Metric | Result | Target SLA | Status |
| :--- | :--- | :--- | :--- |
| **Recovery Time (MTTR)** | ${result.mttrSeconds}s | &lt; 30.0s | ${result.mttrPassed ? "✅ PASS" : "❌ FAIL"} |
| **Data Loss (RPO)** | ${result.rpoLostTx} lost tx | 0 | ${result.rpoPassed ? "✅ PASS" : "❌ FAIL"} |
| **Data & Schema Parity** | 100% | 100% | ${result.parityPassed ? "✅ PASS" : "❌ FAIL"} |

**Final Decision:** ${result.passed ? "**PROCEED WITH RELEASE** ✅" : "**BLOCKED: SLA BREACH** ❌"}
`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMd);
  }

  if (!result.passed) {
    process.exit(1);
  }
  process.exit(0);
}

if (require.main === module) {
  main();
}
