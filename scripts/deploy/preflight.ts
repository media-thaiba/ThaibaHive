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

import fs from "fs";
import {
  validatePreflightEnv,
  validateWorkspaceLinks,
  validateBuildArtifact,
  validateLiveHealth,
  writePreflightReport,
  renderChecks,
} from "./preflight-core";

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const baseUrlFlag = args.find((a) => a.startsWith("--base-url="));
  const baseUrl = baseUrlFlag ? baseUrlFlag.split("=")[1] : undefined;

  const envFileFlag = args.find((a) => a.startsWith("--env-file="));
  const envFilePath = envFileFlag ? envFileFlag.split("=")[1] : undefined;

  const mergedEnv: Record<string, string | undefined> = { ...process.env };
  if (envFilePath && fs.existsSync(envFilePath)) {
    const loaded = parseEnvFile(fs.readFileSync(envFilePath, "utf8"));
    Object.assign(mergedEnv, loaded);
  } else if (fs.existsSync(".env.production.local")) {
    const loaded = parseEnvFile(fs.readFileSync(".env.production.local", "utf8"));
    Object.assign(mergedEnv, loaded);
  }

  const envChecks = validatePreflightEnv(mergedEnv);
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