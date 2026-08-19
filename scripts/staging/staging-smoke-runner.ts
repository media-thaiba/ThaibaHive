#!/usr/bin/env node
/**
 * @file Staging Smoke Test Runner Framework
 * Orchestrates health, database, auth, critical API, and APM latency smoke tests.
 * Produces structured JSON summary at staging-reports/smoke-test-summary.json.
 */

import fs from "fs";
import path from "path";
import { validateHealthAndDatabase, type ValidationResult } from "./validators/health-db-validator";
import { validateApisAndAuth, createTestToken } from "./validators/api-auth-validator";
import { validateMetricsAndLatency } from "./validators/metrics-validator";

interface SmokeRunnerConfig {
  baseUrl: string;
  healthSecret?: string;
  metricsSecret?: string;
  jwtSecret: string;
  dryRun?: boolean;
}

export interface SmokeSummaryReport {
  timestamp: string;
  baseUrl: string;
  durationMs: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  allPassed: boolean;
  results: ValidationResult[];
}

export async function runStagingSmokeTests(
  config: SmokeRunnerConfig
): Promise<SmokeSummaryReport> {
  const startTime = Date.now();
  const allResults: ValidationResult[] = [];

  if (config.dryRun) {
    console.log("🔍 [SmokeRunner] Dry-run mode: Mocking successful suite validation...");
    allResults.push(
      { suite: "Health & DB", name: "Health Endpoint (Dry-Run)", passed: true, durationMs: 5 },
      { suite: "Health & DB", name: "Database Ping (Dry-Run)", passed: true, durationMs: 8 },
      { suite: "Auth & APIs", name: "Mobile Nonce Endpoint (Dry-Run)", passed: true, durationMs: 12 },
      { suite: "Auth & APIs", name: "Student Roster Query (Dry-Run)", passed: true, durationMs: 15 },
      { suite: "Auth & APIs", name: "RBAC Boundary Enforcement (Dry-Run)", passed: true, durationMs: 10 },
      { suite: "APM & Latency", name: "Metrics JSON Schema (Dry-Run)", passed: true, durationMs: 14 },
      { suite: "APM & Latency", name: "p95 Latency Baseline (Dry-Run)", passed: true, durationMs: 25 },
      { suite: "APM & Latency", name: "Prometheus Format (Dry-Run)", passed: true, durationMs: 11 }
    );
  } else {
    // 1. Health and Database
    console.log("⏳ [SmokeRunner] Running Health & Database checks...");
    const healthResults = await validateHealthAndDatabase(config.baseUrl, config.healthSecret);
    allResults.push(...healthResults);

    // 2. Auth & Critical APIs
    console.log("⏳ [SmokeRunner] Running Auth & Critical API checks...");
    const apiResults = await validateApisAndAuth(config.baseUrl, config.jwtSecret);
    allResults.push(...apiResults);

    // 3. APM Metrics & Latency
    console.log("⏳ [SmokeRunner] Running APM Telemetry & Latency SLA checks...");
    const adminToken = await createTestToken(config.jwtSecret, "super_admin");
    const metricResults = await validateMetricsAndLatency(
      config.baseUrl,
      config.metricsSecret,
      adminToken
    );
    allResults.push(...metricResults);
  }

  const durationMs = Date.now() - startTime;
  const passedChecks = allResults.filter((r) => r.passed).length;
  const failedChecks = allResults.filter((r) => !r.passed).length;
  const allPassed = failedChecks === 0 && allResults.length > 0;

  const report: SmokeSummaryReport = {
    timestamp: new Date().toISOString(),
    baseUrl: config.baseUrl,
    durationMs,
    totalChecks: allResults.length,
    passedChecks,
    failedChecks,
    allPassed,
    results: allResults,
  };

  // Write summary report artifact
  const reportsDir = path.resolve(process.cwd(), "staging-reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const reportPath = path.join(reportsDir, "smoke-test-summary.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  return report;
}

// Direct CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (name: string, def = ""): string => {
    const prefix = `--${name}=`;
    const found = args.find((a) => a.startsWith(prefix));
    return found ? found.substring(prefix.length) : def;
  };

  const isDryRun = args.includes("--dry-run");
  const baseUrl = getArg("url", process.env.STAGING_URL || "http://localhost:3000");
  const healthSecret = getArg("secret", process.env.HEALTH_SECRET || "");
  const metricsSecret = getArg("metrics-secret", process.env.METRICS_SECRET || "");
  const jwtSecret = getArg("jwt-secret", process.env.AUTH_JWT_SECRET || "staging-smoke-jwt-secret-placeholder-32-chars");

  console.log("\n=======================================================");
  console.log("  🚀 THAIBAHIVE AUTOMATED STAGING SMOKE TEST RUNNER");
  console.log("=======================================================");
  console.log(` Target URL : ${baseUrl}`);
  console.log(` Mode       : ${isDryRun ? "DRY RUN" : "LIVE TARGET"}`);
  console.log(` Timestamp  : ${new Date().toISOString()}\n`);

  runStagingSmokeTests({
    baseUrl,
    healthSecret,
    metricsSecret,
    jwtSecret,
    dryRun: isDryRun,
  })
    .then((report) => {
      console.log("\n-------------------------------------------------------");
      console.log("  📊 SMOKE TEST EXECUTION RESULTS");
      console.log("-------------------------------------------------------");

      for (const res of report.results) {
        const icon = res.passed ? "✅ PASS" : "❌ FAIL";
        console.log(` [${res.suite}] ${icon} - ${res.name} (${res.durationMs}ms)`);
        if (res.error) {
          console.log(`       ⚠️  Error: ${res.error}`);
        }
      }

      console.log("-------------------------------------------------------");
      console.log(` Total Checks : ${report.totalChecks}`);
      console.log(` Passed       : ${report.passedChecks}`);
      console.log(` Failed       : ${report.failedChecks}`);
      console.log(` Total Time   : ${report.durationMs}ms`);
      console.log(` Status       : ${report.allPassed ? "✅ ALL CHECKS PASSED" : "❌ VALIDATION FAILED"}`);
      console.log("=======================================================\n");

      process.exit(report.allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error("\n❌ [SmokeRunner] Unhandled execution error:", err);
      process.exit(1);
    });
}
