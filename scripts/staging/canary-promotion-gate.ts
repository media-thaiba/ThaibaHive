#!/usr/bin/env node
/**
 * @file Canary Promotion Gate Evaluator
 * Evaluates staging smoke reports against production release promotion criteria.
 * Enforces 0 errors, 100% smoke pass, 0 pending migrations, and max 20% latency regression threshold.
 */

import fs from "fs";
import path from "path";
import type { SmokeSummaryReport } from "./staging-smoke-runner";

export interface PromotionDecision {
  allowed: boolean;
  reasons: string[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
    stagingP95Ms?: number;
    baselineP95Ms: number;
    latencyDeltaPct?: number;
    errorRatePct?: number;
    migrationIntegrityVerified: boolean;
  };
}

export function evaluateCanaryPromotion(
  report: SmokeSummaryReport,
  baselineP95Ms = 250
): PromotionDecision {
  const reasons: string[] = [];

  // 1. 100% Smoke Check Pass Rule
  if (!report.allPassed || report.failedChecks > 0) {
    reasons.push(
      `Smoke test failure: ${report.failedChecks}/${report.totalChecks} checks failed.`
    );
  }

  // 2. Migration Schema Parity Rule (0 Pending / 0 Missing Migrations)
  const migrationCheck = report.results.find((r) =>
    r.name.toLowerCase().includes("migration")
  );
  let migrationIntegrityVerified = false;
  if (migrationCheck) {
    if (!migrationCheck.passed) {
      reasons.push(
        `Database migration integrity failure: ${migrationCheck.error || "Pending or missing migrations detected"}.`
      );
    } else {
      migrationIntegrityVerified = true;
    }
  }

  // 3. Error Rate Baseline Rule (0.00% Errors Allowed)
  let errorRatePct: number | undefined;
  const metricsCheck = report.results.find((r) =>
    r.name.toLowerCase().includes("metrics endpoint") || r.name.toLowerCase().includes("error rate")
  );
  if (metricsCheck?.details && typeof (metricsCheck.details as any).errorRate === "number") {
    errorRatePct = (metricsCheck.details as any).errorRate;
    if (errorRatePct > 0.0) {
      reasons.push(
        `Production safety violation: Staging error rate is ${errorRatePct}% (0.00% required for promotion).`
      );
    }
  }

  // 4. Latency Regression Delta Rule (Max +20% over baseline)
  let stagingP95Ms: number | undefined;
  const p95Check = report.results.find((r) =>
    r.name.toLowerCase().includes("p95")
  );
  if (p95Check && typeof p95Check.durationMs === "number") {
    stagingP95Ms = p95Check.durationMs;
  }

  let latencyDeltaPct: number | undefined;
  if (stagingP95Ms !== undefined && baselineP95Ms > 0) {
    latencyDeltaPct = Number(
      (((stagingP95Ms - baselineP95Ms) / baselineP95Ms) * 100).toFixed(2)
    );

    if (latencyDeltaPct > 20 && stagingP95Ms > baselineP95Ms) {
      reasons.push(
        `Latency regression detected: Staging p95 (${stagingP95Ms}ms) exceeds baseline (${baselineP95Ms}ms) by ${latencyDeltaPct}% (max allowed: 20%).`
      );
    }
  }

  const allowed = reasons.length === 0;

  return {
    allowed,
    reasons,
    metrics: {
      totalChecks: report.totalChecks,
      failedChecks: report.failedChecks,
      stagingP95Ms,
      baselineP95Ms,
      latencyDeltaPct,
      errorRatePct,
      migrationIntegrityVerified,
    },
  };
}

export async function dispatchAlertWebhook(
  webhookUrl: string,
  decision: PromotionDecision,
  report: SmokeSummaryReport
): Promise<boolean> {
  try {
    const payload = {
      event: "canary_promotion_blocked",
      timestamp: new Date().toISOString(),
      service: "thaibahive",
      environment: "staging",
      reasons: decision.reasons,
      metrics: decision.metrics,
      totalChecks: report.totalChecks,
      failedChecks: report.failedChecks,
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error("⚠️ [CanaryGate] Failed to dispatch alert webhook:", err);
    return false;
  }
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (name: string, def = ""): string => {
    const prefix = `--${name}=`;
    const found = args.find((a) => a.startsWith(prefix));
    return found ? found.substring(prefix.length) : def;
  };

  const baselineP95 = Number(getArg("baseline-p95", "250"));
  const reportPath = path.resolve(process.cwd(), "staging-reports", "smoke-test-summary.json");

  console.log("\n=======================================================");
  console.log("  🛡️  THAIBAHIVE CANARY PROMOTION GATE EVALUATOR");
  console.log("=======================================================");
  console.log(` Report Path   : ${reportPath}`);
  console.log(` Baseline p95  : ${baselineP95}ms`);
  console.log(` Threshold     : Max +20% Latency Degradation, 0.00% Errors, 0 Pending Migrations\n`);

  if (!fs.existsSync(reportPath)) {
    console.error("❌ [CanaryGate] Smoke test summary report not found at:", reportPath);
    process.exit(1);
  }

  let report: SmokeSummaryReport;
  try {
    report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  } catch (err) {
    console.error("❌ [CanaryGate] Failed to parse smoke report JSON:", err);
    process.exit(1);
  }

  const decision = evaluateCanaryPromotion(report, baselineP95);

  if (decision.allowed) {
    console.log("✅ [CanaryGate] PROMOTION ALLOWED: All canary gates passed successfully.");
    console.log(`   - Smoke Checks Passed : ${report.passedChecks}/${report.totalChecks}`);
    if (decision.metrics.stagingP95Ms !== undefined) {
      console.log(`   - Staging p95 Latency : ${decision.metrics.stagingP95Ms}ms (Baseline: ${baselineP95}ms)`);
    }
    console.log("=======================================================\n");

    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `promotion_allowed=true\n`);
    }
    process.exit(0);
  } else {
    console.error("❌ [CanaryGate] PROMOTION BLOCKED: Staging verification failed!");
    for (const r of decision.reasons) {
      console.error(`   ⚠️  ${r}`);
    }
    console.error("=======================================================\n");

    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (webhookUrl) {
      console.log("🚨 [CanaryGate] Firing alert notification to webhook...");
      dispatchAlertWebhook(webhookUrl, decision, report).finally(() => {
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, `promotion_allowed=false\n`);
        }
        process.exit(1);
      });
    } else {
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `promotion_allowed=false\n`);
      }
      process.exit(1);
    }
  }
}
