import * as fs from "fs";
import * as path from "path";

/**
 * Live-run report output is written to a gitignored subdirectory so that
 * re-running drills, simulations, and scanners never dirties the tracked
 * `reports/` baselines. Override with THAIBAHIVE_REPORTS_DIR when a CI job
 * needs to publish artifacts to an explicit location.
 */
export const LIVE_REPORTS_SUBDIR = "local";

export function resolveLiveReportsDir(): string {
  const override = process.env.THAIBAHIVE_REPORTS_DIR;
  if (override) {
    return path.resolve(process.cwd(), override);
  }
  return path.resolve(process.cwd(), "reports", LIVE_REPORTS_SUBDIR);
}

export function resolveLiveExecutionDir(): string {
  return path.resolve(process.cwd(), ".ai", "execution", LIVE_REPORTS_SUBDIR);
}

export function ensureDir(dir: string): string {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function writeJsonReport(fileName: string, payload: unknown, dir = resolveLiveReportsDir()): string {
  const reportPath = path.join(ensureDir(dir), fileName);
  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2));
  return reportPath;
}
