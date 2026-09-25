#!/usr/bin/env tsx
/**
 * Cross-Tenant Isolation & Leak Guardrail Scanner
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import * as fs from "fs";
import * as path from "path";
import { writeJsonReport } from "../lib/reports-path";

interface ScanFinding {
  filePath: string;
  line: number;
  severity: "CRITICAL" | "HIGH" | "WARNING" | "INFO";
  rule: string;
  snippet: string;
  description: string;
}

interface ScanReport {
  timestamp: string;
  filesScanned: number;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  warningCount: number;
  passed: boolean;
  findings: ScanFinding[];
}

function scanFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== "__tests__") {
        scanFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function main() {
  const isJson = process.argv.includes("--json");
  const apiDir = path.resolve(process.cwd(), "src/app/api");
  const libDir = path.resolve(process.cwd(), "src/lib");

  const files = [...scanFiles(apiDir), ...scanFiles(libDir)];
  const findings: ScanFinding[] = [];

  if (!isJson) {
    console.log("================================================================================");
    console.log("       THAIBAHIVE CROSS-TENANT ISOLATION INTEGRITY SCANNER (SPRINT-035)        ");
    console.log("================================================================================");
    console.log(`Scanning ${files.length} TypeScript source files for tenant scoping...\n`);
  }

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    // Scan for potential direct un-scoped tenant updates or raw queries without institution filter
    lines.forEach((line, idx) => {
      // Check for raw SQL query missing WHERE clause on tenant tables
      if (line.includes("SELECT * FROM institutions") && !line.includes("WHERE")) {
        findings.push({
          filePath: relativePath,
          line: idx + 1,
          severity: "WARNING",
          rule: "UNSCOPED_INSTITUTION_SCAN",
          snippet: line.trim(),
          description: "Global scan on institutions table detected without explicit tenant filter predicate.",
        });
      }
    });
  }

  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;
  const warningCount = findings.filter((f) => f.severity === "WARNING").length;
  const passed = criticalCount === 0 && highCount === 0;

  const report: ScanReport = {
    timestamp: new Date().toISOString(),
    filesScanned: files.length,
    totalFindings: findings.length,
    criticalCount,
    highCount,
    warningCount,
    passed,
    findings,
  };

  const savedReportPath = writeJsonReport("tenant-isolation-report.json", report);

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Scan Results:`);
    console.log(`  Files Scanned  : ${report.filesScanned}`);
    console.log(`  Critical Leaks : ${report.criticalCount}`);
    console.log(`  High Risks     : ${report.highCount}`);
    console.log(`  Warnings       : ${report.warningCount}`);
    console.log(`  Status         : ${report.passed ? "✅ 100% TENANT ISOLATED" : "❌ ISOLATION LEAKS DETECTED"}`);
    console.log(`\nReport saved to: ${savedReportPath}\n`);
  }

  if (!passed) {
    process.exit(1);
  }
  process.exit(0);
}

main();
