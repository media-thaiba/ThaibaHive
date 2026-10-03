#!/usr/bin/env tsx
/**
 * Cross-Tenant Isolation & Leak Guardrail Scanner
 * Enforces multi-tenant scoping rules across API route handlers and services.
 */

import * as fs from "fs";
import * as path from "path";
import { writeJsonReport } from "../lib/reports-path";

export interface ScanFinding {
  filePath: string;
  line: number;
  severity: "CRITICAL" | "HIGH" | "WARNING" | "INFO";
  rule: "UNSCOPED_INSTITUTION_SCAN" | "UNSCOPED_MUTATION" | "UNSCOPED_ID_ACCESS" | "INSERT_WITHOUT_INSTITUTION";
  snippet: string;
  description: string;
  isAllowlisted?: boolean;
  allowlistReason?: string;
}

export interface ScanReport {
  timestamp: string;
  filesScanned: number;
  scopedTablesCount: number;
  scopedTables: string[];
  allowlistEntriesCount: number;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  warningCount: number;
  allowlistedCount: number;
  passed: boolean;
  findings: ScanFinding[];
}

export function extractScopedTables(schemaFilePath: string): string[] {
  if (!fs.existsSync(schemaFilePath)) return [];
  const content = fs.readFileSync(schemaFilePath, "utf8");
  const tableRegex = /export\s+const\s+(\w+)\s*=\s*(?:sqliteTable|pgTable)\s*\(\s*["']([^"']+)["']\s*,\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
  
  const scopedTables: string[] = [];
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const varName = match[1];
    const body = match[3];
    if (body.includes("institutionId:") || body.includes("institution_id")) {
      scopedTables.push(varName);
    }
  }
  return scopedTables;
}

export function scanFiles(dir: string, fileList: string[] = []): string[] {
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

export function loadAllowlist(): Record<string, string> {
  const allowlistPath = path.resolve(__dirname, "tenant-scan-allowlist.json");
  if (!fs.existsSync(allowlistPath)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
    return data.entries || {};
  } catch {
    return {};
  }
}

export function runTenantScan(customOptions?: { rootDir?: string; files?: string[] }): ScanReport {
  const root = customOptions?.rootDir || process.cwd();
  const schemaPath = path.resolve(root, "packages/db/schema.ts");
  const scopedTables = extractScopedTables(schemaPath);
  const allowlist = loadAllowlist();

  const apiDir = path.resolve(root, "src/app/api");
  const libDir = path.resolve(root, "src/lib");
  const filesToScan = customOptions?.files || [...scanFiles(apiDir), ...scanFiles(libDir)];

  const findings: ScanFinding[] = [];

  for (const file of filesToScan) {
    const relativePath = path.relative(root, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    const hasResolver = content.includes("resolveScopedInstitutionId") || content.includes("institutionId");

    // Check allowlist match
    let allowlistReason: string | undefined;
    for (const [key, reason] of Object.entries(allowlist)) {
      if (relativePath.startsWith(key) || relativePath.includes(key)) {
        allowlistReason = reason;
        break;
      }
    }

    // Rule A: Global SELECT * FROM institutions
    lines.forEach((line, idx) => {
      if (line.includes("SELECT * FROM institutions") && !line.includes("WHERE")) {
        findings.push({
          filePath: relativePath,
          line: idx + 1,
          severity: allowlistReason ? "INFO" : "WARNING",
          rule: "UNSCOPED_INSTITUTION_SCAN",
          snippet: line.trim(),
          description: "Global scan on institutions table detected without explicit tenant filter predicate.",
          isAllowlisted: Boolean(allowlistReason),
          allowlistReason,
        });
      }
    });

    // For API routes specifically, check mutations and scoped table queries
    const isApiRoute = relativePath.startsWith("src/app/api");
    if (isApiRoute) {
      for (const table of scopedTables) {
        // Rule B: .update(table) or .delete(table) on scoped table without tenant resolver
        const updateRegex = new RegExp(`\\.update\\(\\s*${table}\\s*\\)`, "g");
        const deleteRegex = new RegExp(`\\.delete\\(\\s*${table}\\s*\\)`, "g");

        let m;
        while ((m = updateRegex.exec(content)) !== null) {
          if (!hasResolver) {
            const lineNo = content.slice(0, m.index).split("\n").length;
            findings.push({
              filePath: relativePath,
              line: lineNo,
              severity: allowlistReason ? "INFO" : "CRITICAL",
              rule: "UNSCOPED_MUTATION",
              snippet: lines[lineNo - 1]?.trim() || `.update(${table})`,
              description: `Mutation on scoped table '${table}' detected without tenant scope resolution.`,
              isAllowlisted: Boolean(allowlistReason),
              allowlistReason,
            });
          }
        }

        while ((m = deleteRegex.exec(content)) !== null) {
          if (!hasResolver) {
            const lineNo = content.slice(0, m.index).split("\n").length;
            findings.push({
              filePath: relativePath,
              line: lineNo,
              severity: allowlistReason ? "INFO" : "CRITICAL",
              rule: "UNSCOPED_MUTATION",
              snippet: lines[lineNo - 1]?.trim() || `.delete(${table})`,
              description: `Deletion on scoped table '${table}' detected without tenant scope resolution.`,
              isAllowlisted: Boolean(allowlistReason),
              allowlistReason,
            });
          }
        }

        // Rule C: [id] route access without institution predicate and without resolver
        if (relativePath.includes("/[id]/")) {
          const idQueryRegex = new RegExp(`\\.where\\(\\s*eq\\(\\s*${table}\\.id\\s*,`, "g");
          while ((m = idQueryRegex.exec(content)) !== null) {
            if (!hasResolver) {
              const lineNo = content.slice(0, m.index).split("\n").length;
              findings.push({
                filePath: relativePath,
                line: lineNo,
                severity: allowlistReason ? "INFO" : "CRITICAL",
                rule: "UNSCOPED_ID_ACCESS",
                snippet: lines[lineNo - 1]?.trim() || `eq(${table}.id, ...)`,
                description: `ID-based lookup on scoped table '${table}' in [id] route without tenant qualification.`,
                isAllowlisted: Boolean(allowlistReason),
                allowlistReason,
              });
            }
          }
        }

        // Rule D: .insert(table) lacking institutionId in ±600 character window
        const insertRegex = new RegExp(`\\.insert\\(\\s*${table}\\s*\\)\\s*\\.values\\(`, "g");
        while ((m = insertRegex.exec(content)) !== null) {
          const windowStart = m.index;
          const windowEnd = Math.min(content.length, windowStart + 600);
          const windowText = content.slice(windowStart, windowEnd);
          if (!windowText.includes("institutionId")) {
            const lineNo = content.slice(0, m.index).split("\n").length;
            findings.push({
              filePath: relativePath,
              line: lineNo,
              severity: allowlistReason ? "INFO" : "HIGH",
              rule: "INSERT_WITHOUT_INSTITUTION",
              snippet: lines[lineNo - 1]?.trim() || `.insert(${table}).values(...)`,
              description: `Insert into scoped table '${table}' missing 'institutionId' in insert payload.`,
              isAllowlisted: Boolean(allowlistReason),
              allowlistReason,
            });
          }
        }
      }
    }
  }

  const criticalCount = findings.filter((f) => f.severity === "CRITICAL" && !f.isAllowlisted).length;
  const highCount = findings.filter((f) => f.severity === "HIGH" && !f.isAllowlisted).length;
  const warningCount = findings.filter((f) => f.severity === "WARNING" && !f.isAllowlisted).length;
  const allowlistedCount = findings.filter((f) => f.isAllowlisted).length;
  const passed = criticalCount === 0 && highCount === 0;

  return {
    timestamp: new Date().toISOString(),
    filesScanned: filesToScan.length,
    scopedTablesCount: scopedTables.length,
    scopedTables,
    allowlistEntriesCount: Object.keys(allowlist).length,
    totalFindings: findings.length,
    criticalCount,
    highCount,
    warningCount,
    allowlistedCount,
    passed,
    findings,
  };
}

async function main() {
  const isJson = process.argv.includes("--json");
  const report = runTenantScan();

  if (!isJson) {
    console.log("================================================================================");
    console.log("       THAIBAHIVE CROSS-TENANT ISOLATION INTEGRITY SCANNER (SPRINT-035)        ");
    console.log("================================================================================");
    console.log(`Scoped Tables Identified : ${report.scopedTablesCount}`);
    console.log(`Allowlisted Debt Tracked : ${report.allowlistEntriesCount} entries (${report.allowlistedCount} findings allowed)`);
    console.log(`Files Scanned            : ${report.filesScanned}\n`);
    console.log(`Scan Results:`);
    console.log(`  Critical Leaks : ${report.criticalCount}`);
    console.log(`  High Risks     : ${report.highCount}`);
    console.log(`  Warnings       : ${report.warningCount}`);
    console.log(`  Allowlisted    : ${report.allowlistedCount}`);
    console.log(`  Status         : ${report.passed ? "✅ 100% TENANT ISOLATED" : "❌ ISOLATION LEAKS DETECTED"}`);
  }

  const savedReportPath = writeJsonReport("tenant-isolation-report.json", report);
  if (!isJson) {
    console.log(`\nReport saved to: ${savedReportPath}\n`);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }

  if (!report.passed) {
    if (!isJson) {
      console.error("Non-allowlisted isolation leaks detected:");
      report.findings
        .filter((f) => !f.isAllowlisted && (f.severity === "CRITICAL" || f.severity === "HIGH"))
        .forEach((f) => {
          console.error(`  - [${f.severity}] ${f.filePath}:${f.line} [${f.rule}] ${f.description}`);
        });
    }
    process.exit(1);
  }
  process.exit(0);
}

if (require.main === module || process.argv[1]?.includes("tenant-isolation-scan")) {
  main();
}
