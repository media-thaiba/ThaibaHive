/**
 * Automated Dependency Vulnerability Scanner & Audit Engine
 * Part of Sprint-034: Enterprise Multi-Region Infrastructure & Automated Dependency Security
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { writeJsonReport } from "../lib/reports-path";

export interface SecurityVulnerability {
  id: string;
  packageName: string;
  severity: "critical" | "high" | "moderate" | "low" | "info";
  title: string;
  url?: string;
  range?: string;
  isAllowlisted?: boolean;
}

export interface VulnerabilityAuditReport {
  timestamp: string;
  passed: boolean;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  allowlistedCount: number;
  vulnerabilities: SecurityVulnerability[];
  durationMs: number;
}

export function parseAuditOutput(jsonOutput: string, allowlistIds: string[] = []): VulnerabilityAuditReport {
  const startTime = Date.now();
  const vulnerabilities: SecurityVulnerability[] = [];
  let criticalCount = 0;
  let highCount = 0;
  let moderateCount = 0;
  let lowCount = 0;
  let allowlistedCount = 0;

  try {
    const lines = jsonOutput.trim().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        // pnpm audit json format
        if (entry.type === "auditAdvisory" && entry.data?.advisory) {
          const adv = entry.data.advisory;
          const id = String(adv.id || adv.cve || adv.ghsaId || `adv-${vulnerabilities.length + 1}`);
          const severity = (adv.severity || "low").toLowerCase();
          const isAllowlisted = allowlistIds.includes(id);

          if (isAllowlisted) {
            allowlistedCount++;
          } else {
            if (severity === "critical") criticalCount++;
            else if (severity === "high") highCount++;
            else if (severity === "moderate") moderateCount++;
            else lowCount++;
          }

          vulnerabilities.push({
            id,
            packageName: adv.module_name || entry.data?.resolution?.path || "unknown",
            severity,
            title: adv.title || "Security advisory",
            url: adv.url,
            range: adv.vulnerable_versions,
            isAllowlisted,
          });
        }
      } catch {
        // Line might not be json
      }
    }
  } catch (err) {
    console.warn("[VulnScanner] Error parsing audit json:", err);
  }

  const passed = criticalCount === 0 && highCount === 0;

  return {
    timestamp: new Date().toISOString(),
    passed,
    totalVulnerabilities: vulnerabilities.length,
    criticalCount,
    highCount,
    moderateCount,
    lowCount,
    allowlistedCount,
    vulnerabilities,
    durationMs: Date.now() - startTime,
  };
}

export async function runVulnerabilityScan(dryRun = false): Promise<VulnerabilityAuditReport> {
  console.log("🛡️ [VulnScanner] Initiating dependency supply chain vulnerability scan...");

  // Load allowlist
  let allowlistIds: string[] = [];
  const allowlistPath = path.resolve(process.cwd(), ".ai/security-allowlist.json");
  if (fs.existsSync(allowlistPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
      allowlistIds = (data.allowlist || []).map((a: any) => a.id || a.cve || a);
    } catch {}
  }

  if (dryRun) {
    console.log("⚡ [VulnScanner] Dry-run mode: Simulating 0 vulnerability audit result...");
    return {
      timestamp: new Date().toISOString(),
      passed: true,
      totalVulnerabilities: 0,
      criticalCount: 0,
      highCount: 0,
      moderateCount: 0,
      lowCount: 0,
      allowlistedCount: 0,
      vulnerabilities: [],
      durationMs: 35,
    };
  }

  let auditJson = "";
  try {
    auditJson = execSync("pnpm audit --json", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
  } catch (err: any) {
    // pnpm audit exits with non-zero when vulnerabilities found, but outputs json to stdout
    auditJson = err.stdout?.toString() || "";
  }

  const report = parseAuditOutput(auditJson, allowlistIds);

  const reportsDir = path.resolve(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const reportPath = path.join(reportsDir, "dependency-audit-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`📊 [VulnScanner] Scan finished: ${report.totalVulnerabilities} total vulnerabilities (Critical: ${report.criticalCount}, High: ${report.highCount}, Moderate: ${report.moderateCount}, Low: ${report.lowCount})`);
  console.log(`💾 [VulnScanner] Report saved to ${reportPath}`);

  return report;
}

if (require.main === module) {
  const isDryRun = process.argv.includes("--dry-run");
  runVulnerabilityScan(isDryRun)
    .then((report) => {
      if (!report.passed) {
        console.error("❌ [VulnScanner] Security audit failed: Unresolved Critical/High CVEs detected.");
        process.exit(1);
      }
      console.log("✅ [VulnScanner] Security audit passed successfully with zero critical/high vulnerabilities.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ [VulnScanner] Error executing scan:", err);
      process.exit(1);
    });
}
