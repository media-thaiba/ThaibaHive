/**
 * @file Production Preflight core checks (Phase 7 / 7.5 Deployment Readiness)
 *
 * Pure, jest-safe helpers. Does not use import.meta / __dirname so it can be
 * imported from unit tests without module-format conflicts. Always run from
 * the repo root (package.json script does), so repoRoot = process.cwd().
 */

import fs from "fs";
import path from "path";
import { validateEnvironment } from "../../src/lib/config/env-validation";

const DEV_JWT_PLACEHOLDERS = [
  "dev-jwt-secret-min-32-chars-long-security-key-thaibahive",
  "ci-build-secret-min-32-chars-thaibahive-placeholder",
];

export interface PreflightCheck {
  gate: string;
  name: string;
  passed: boolean;
  detail?: string;
}

export interface PreflightReport {
  timestamp: string;
  version: string;
  passed: boolean;
  checks: PreflightCheck[];
}

const repoRoot = process.cwd();

/**
 * Validate production environment integrity. Returns failures rather than
 * throwing so callers (tests/CI) can inspect them.
 */
export function validatePreflightEnv(
  env: Record<string, string | undefined>
): { passed: boolean; checks: PreflightCheck[] } {
  const checks: PreflightCheck[] = [];

  const parsed = validateEnvironment(env);
  checks.push({
    gate: "ENV",
    name: "Environment schema validity",
    passed: parsed.valid,
    detail: parsed.valid ? undefined : JSON.stringify(parsed.errors),
  });

  const jwt = env.AUTH_JWT_SECRET || env.JWT_SECRET || "";
  checks.push({
    gate: "ENV",
    name: "JWT signing secret configured (non-empty, >= 16 chars)",
    passed: jwt.length >= 16,
  });

  checks.push({
    gate: "ENV",
    name: "No dev/CI placeholder secret used in production",
    passed: !DEV_JWT_PLACEHOLDERS.includes(jwt),
  });

  for (const key of ["DATABASE_URL", "HEALTH_SECRET", "METRICS_SECRET"] as const) {
    checks.push({
      gate: "ENV",
      name: `${key} configured`,
      passed: Boolean(env[key]),
    });
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL || "";
  let urlOk = false;
  try {
    const u = new URL(appUrl);
    urlOk = u.protocol === "https:" || u.protocol === "http:";
  } catch {
    urlOk = false;
  }
  checks.push({
    gate: "ENV",
    name: "NEXT_PUBLIC_APP_URL is a valid http(s) URL",
    passed: urlOk,
  });

  return { passed: checks.every((c) => c.passed), checks };
}

export function validateWorkspaceLinks(): { passed: boolean; checks: PreflightCheck[] } {
  const checks: PreflightCheck[] = [];
  for (const pkg of ["auth", "db"] as const) {
    const linkPath = path.join(repoRoot, "node_modules", "@thaiba", pkg);
    const ok = fs.existsSync(linkPath);
    checks.push({
      gate: "WORKSPACE",
      name: `node_modules/@thaiba/${pkg} linked`,
      passed: ok,
      detail: ok ? undefined : "run `pnpm install`",
    });
  }
  return { passed: checks.every((c) => c.passed), checks };
}

export function validateBuildArtifact(): { passed: boolean; checks: PreflightCheck[] } {
  const serverPath = path.join(repoRoot, ".next", "standalone", "server.js");
  const ok = fs.existsSync(serverPath);
  return {
    passed: ok,
    checks: [
      {
        gate: "BUILD",
        name: "Standalone build artifact present (.next/standalone/server.js)",
        passed: ok,
        detail: ok ? undefined : "run `pnpm build` (output: standalone)",
      },
    ],
  };
}

export async function validateLiveHealth(baseUrl: string): Promise<{ passed: boolean; checks: PreflightCheck[] }> {
  const check: PreflightCheck = {
    gate: "LIVE",
    name: `${baseUrl}/api/health returns 200`,
    passed: false,
  };
  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    const body = await res.json().catch(() => ({}));
    check.passed = res.status === 200 && body.status === "ok";
    check.detail = `status=${res.status} body=${JSON.stringify(body)}`;
  } catch (error) {
    check.detail = String(error);
  }
  return { passed: check.passed, checks: [check] };
}

export function writePreflightReport(checks: PreflightCheck[]): string {
  const report: PreflightReport = {
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    passed: checks.every((c) => c.passed),
    checks,
  };
  const reportsDir = path.join(repoRoot, "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, "preflight-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}

export function renderChecks(checks: PreflightCheck[]): string {
  return checks
    .map((c) => `[${c.passed ? "PASS" : "FAIL"}] [${c.gate}] ${c.name}${c.detail ? ` -> ${c.detail}` : ""}`)
    .join("\n");
}