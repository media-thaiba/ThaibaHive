#!/usr/bin/env node
/**
 * @file Production Preflight Gate entry point (Phase 7 / 7.5)
 *
 * Run with: pnpm deploy:preflight [--base-url=https://...]
 *
 *   1. ENV      - production environment integrity (AUTH_JWT_SECRET, no
 *                 dev-default secrets leaked in).
 *   2. WORKSPACE- @thaiba/auth / @thaiba/db links resolvable.
 *   3. BUILD    - standalone build artifact present.
 *   4. LIVE     - (optional --base-url) /api/health returns 200 {status:ok}.
 *
 * Writes reports/preflight-report.json; exits 1 on any failed check.
 */

import {
  validatePreflightEnv,
  validateWorkspaceLinks,
  validateBuildArtifact,
  validateLiveHealth,
  writePreflightReport,
  renderChecks,
} from "./preflight-core";

async function main() {
  const args = process.argv.slice(2);
  const baseUrlFlag = args.find((a) => a.startsWith("--base-url="));
  const baseUrl = baseUrlFlag ? baseUrlFlag.split("=")[1] : undefined;

  const envChecks = validatePreflightEnv({ ...process.env });
  const wsChecks = validateWorkspaceLinks();
  const buildChecks = validateBuildArtifact();
  const liveChecks = baseUrl ? await validateLiveHealth(baseUrl) : { passed: true, checks: [] };

  const allChecks = [...envChecks.checks, ...wsChecks.checks, ...buildChecks.checks, ...liveChecks.checks];

  console.log(renderChecks(allChecks));

  const reportPath = writePreflightReport(allChecks);
  const passedCount = allChecks.filter((c) => c.passed).length;
  const allPassed = allChecks.every((c) => c.passed);

  console.log(`\nPreflight complete: ${allPassed ? "PASSED" : "FAILED"} (${passedCount}/${allChecks.length} checks)`);
  console.log(`Report: ${reportPath}`);
  if (!allPassed) process.exitCode = 1;
}

main().catch((error) => {
  console.error("[Preflight] Unexpected failure:", error);
  process.exitCode = 1;
});