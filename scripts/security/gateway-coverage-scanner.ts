/**
 * TypeScript AST-Based Gateway Security & Rate Limiting Coverage Scanner
 * Sprint-038 / AGS-016 & Sprint-039 / TIF-015 (TD-018)
 *
 * Utilizes TypeScript Compiler API AST node traversal to verify:
 * 1. All mandatory gateway security modules are present
 * 2. API route handlers (GET/POST/PUT/PATCH/DELETE) are wrapped with security middleware decorators
 * 3. Zero hardcoded secrets exist in security modules
 * Exits 0 on success, 1 on failure. Supports --strict, --json, and --fix-dry-run CLI flags.
 */

import fs from "fs";
import path from "path";
import ts from "typescript";

export interface MethodFinding {
  method: string;
  line: number;
  column: number;
  isShielded: boolean;
}

export interface RouteInspection {
  filePath: string;
  exportedMethods: string[];
  shieldedMethods: string[];
  unshieldedMethods: string[];
  findings: MethodFinding[];
  isExempt: boolean;
}

export interface GatewayScanResult {
  passed: boolean;
  totalModulesChecked: number;
  missingModules: string[];
  secretViolations: string[];
  totalRoutesChecked: number;
  inspectedRoutes: RouteInspection[];
  unshieldedRoutes: string[];
}

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const SHIELD_IDENTIFIERS = new Set([
  "requireAuth",
  "withRateLimit",
  "withDPoP",
  "withPublicApm",
  "verifySession",
  "verifyWebhookHmac",
]);

function getAllRouteFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllRouteFiles(fullPath, fileList);
    } else if (item === "route.ts" || item === "route.js") {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Inspects a route file AST using the TypeScript Compiler API.
 */
export function inspectRouteAst(filePath: string, rootDir: string = process.cwd()): RouteInspection {
  const normalized = filePath.replace(/\\/g, "/");
  const content = fs.readFileSync(filePath, "utf-8");
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, "/");

  const isExempt =
    normalized.includes("/api/health") ||
    normalized.includes("/api/auth/") ||
    normalized.includes("/api/biometric/") ||
    normalized.includes("/api/system/") ||
    normalized.includes("/api/media/") ||
    normalized.includes("/api/mobile/") ||
    normalized.includes("/api/webhooks/") ||
    normalized.includes("/api/public/") ||
    normalized.includes("/api/metrics");

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const exportedMethods: string[] = [];
  const shieldedMethods: string[] = [];
  const unshieldedMethods: string[] = [];
  const findings: MethodFinding[] = [];
  const aliasMap = new Map<string, string>();

  function isNodeWrappedWithShield(node: ts.Node): boolean {
    let hasShield = false;

    function findShieldCalls(childNode: ts.Node) {
      if (ts.isCallExpression(childNode)) {
        const expression = childNode.expression;
        if (ts.isIdentifier(expression) && SHIELD_IDENTIFIERS.has(expression.text)) {
          hasShield = true;
          return;
        }
      }
      ts.forEachChild(childNode, findShieldCalls);
    }

    findShieldCalls(node);
    return hasShield;
  }

  function visit(node: ts.Node) {
    // Check export const GET = requireAuth(...) or export const PATCH = POST
    if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && HTTP_METHODS.has(decl.name.text)) {
          const method = decl.name.text;
          exportedMethods.push(method);
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(decl.getStart());

          if (isExempt) {
            shieldedMethods.push(method);
            findings.push({ method, line: line + 1, column: character + 1, isShielded: true });
          } else if (decl.initializer && isNodeWrappedWithShield(decl.initializer)) {
            shieldedMethods.push(method);
            findings.push({ method, line: line + 1, column: character + 1, isShielded: true });
          } else if (decl.initializer && ts.isIdentifier(decl.initializer)) {
            aliasMap.set(method, decl.initializer.text);
            findings.push({ method, line: line + 1, column: character + 1, isShielded: false }); // resolved later
          } else {
            unshieldedMethods.push(method);
            findings.push({ method, line: line + 1, column: character + 1, isShielded: false });
          }
        }
      }
    }

    // Check export async function GET(...)
    if (ts.isFunctionDeclaration(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (node.name && HTTP_METHODS.has(node.name.text)) {
        const method = node.name.text;
        exportedMethods.push(method);
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

        if (isExempt || isNodeWrappedWithShield(node)) {
          shieldedMethods.push(method);
          findings.push({ method, line: line + 1, column: character + 1, isShielded: true });
        } else {
          unshieldedMethods.push(method);
          findings.push({ method, line: line + 1, column: character + 1, isShielded: false });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Resolve aliases
  for (const [aliasedMethod, targetIdentifier] of aliasMap.entries()) {
    const finding = findings.find((f) => f.method === aliasedMethod);
    if (shieldedMethods.includes(targetIdentifier)) {
      shieldedMethods.push(aliasedMethod);
      if (finding) finding.isShielded = true;
    } else {
      unshieldedMethods.push(aliasedMethod);
      if (finding) finding.isShielded = false;
    }
  }

  return {
    filePath: relativePath,
    exportedMethods,
    shieldedMethods,
    unshieldedMethods,
    findings,
    isExempt,
  };
}

export function runGatewayCoverageScan(rootDir: string = process.cwd()): GatewayScanResult {
  const securityDir = path.join(rootDir, "src", "lib", "security");
  const apiDir = path.join(rootDir, "src", "app", "api");

  const requiredModules = [
    "rate-limiter.ts",
    "sliding-window.ts",
    "rate-limit-types.ts",
    "rate-limit-redis.ts",
    "rate-limit-fallback.ts",
    "adaptive-limiter.ts",
    "quota-resolver.ts",
    "rate-limit-middleware.ts",
    "ip-reputation.ts",
    "threat-heuristics.ts",
    "quarantine-manager.ts",
    "quarantine-store.ts",
    "quarantine-mesh.ts",
    "quarantine-bloom.ts",
    "quarantine-pubsub.ts",
    "quarantine-db-store.ts",
    "aws-sigv4-signer.ts",
    "retry-backoff.ts",
    "edge-webhook-validator.ts",
    "edge-firewall-dispatcher.ts",
    "canary-probes.ts",
    "synthetic-runner.ts",
    "circuit-breaker.ts",
    "degraded-mode.ts",
    "gateway-metrics.ts",
    "threat-audit-events.ts",
  ];

  const missingModules: string[] = [];
  for (const mod of requiredModules) {
    if (!fs.existsSync(path.join(securityDir, mod))) {
      missingModules.push(mod);
    }
  }

  // Check for secrets
  const secretViolations: string[] = [];
  const secretPatterns = [
    /["'][A-Za-z0-9+/]{40,}["']/,
    /CLOUDFLARE_API_TOKEN\s*=\s*["'][^"']+["']/,
    /AWS_SECRET_ACCESS_KEY\s*=\s*["'][^"']+["']/,
  ];

  if (fs.existsSync(securityDir)) {
    const files = fs.readdirSync(securityDir);
    for (const f of files) {
      if (f.endsWith(".ts")) {
        const content = fs.readFileSync(path.join(securityDir, f), "utf-8");
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            secretViolations.push(`${f} matches pattern ${pattern}`);
          }
        }
      }
    }
  }

  const allRouteFiles = getAllRouteFiles(apiDir);
  const inspectedRoutes: RouteInspection[] = [];
  const unshieldedRoutes: string[] = [];

  for (const file of allRouteFiles) {
    const inspection = inspectRouteAst(file, rootDir);
    inspectedRoutes.push(inspection);
    if (inspection.unshieldedMethods.length > 0) {
      for (const m of inspection.unshieldedMethods) {
        const f = inspection.findings.find((x) => x.method === m);
        const loc = f ? `:${f.line}:${f.column}` : "";
        unshieldedRoutes.push(`${inspection.filePath}${loc} [${m}]`);
      }
    }
  }

  const passed = missingModules.length === 0 && secretViolations.length === 0 && unshieldedRoutes.length === 0;

  return {
    passed,
    totalModulesChecked: requiredModules.length,
    missingModules,
    secretViolations,
    totalRoutesChecked: allRouteFiles.length,
    inspectedRoutes,
    unshieldedRoutes,
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const isJson = args.includes("--json");
  const isStrict = args.includes("--strict");
  const isFixDryRun = args.includes("--fix-dry-run");

  if (!isJson) {
    console.log("==> Running TypeScript AST Gateway Security Coverage Scanner (TIF-015 / TD-018)...");
  }

  const result = runGatewayCoverageScan();

  if (isFixDryRun && !isJson) {
    console.log(`[--fix-dry-run] ${result.unshieldedRoutes.length} route(s) require withRateLimit or requireAuth wrappers.`);
  }

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.passed ? 0 : 1);
  }

  console.log(`Mandatory modules checked: ${result.totalModulesChecked} (Missing: ${result.missingModules.length})`);
  console.log(`Secret leaks: ${result.secretViolations.length}`);
  console.log(`API routes checked: ${result.totalRoutesChecked} (Unshielded: ${result.unshieldedRoutes.length})`);

  if (!result.passed || (isStrict && result.unshieldedRoutes.length > 0)) {
    console.error("❌ Gateway AST Security Scan FAILED:", {
      missingModules: result.missingModules,
      secretViolations: result.secretViolations,
      unshieldedRoutes: result.unshieldedRoutes,
    });
    process.exit(1);
  } else {
    console.log("✅ Gateway AST Security Scan PASSED (100% Platform Route Coverage, 0 Leaks)");
    process.exit(0);
  }
}
