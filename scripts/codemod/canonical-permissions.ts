#!/usr/bin/env ts-node

/**
 * Canonical Permission Codemod
 * 
 * Transforms all permission strings in the codebase to canonical `domain.resource.action` format.
 * Uses ts-morph for TypeScript/TSX files and regex for Dart files.
 * 
 * Usage:
 *   tsx scripts/codemod/canonical-permissions.ts --dry-run    # Preview changes
 *   tsx scripts/codemod/canonical-permissions.ts --apply       # Apply changes
 *   tsx scripts/codemod/canonical-permissions.ts --verify      # Verify no non-canonical strings remain
 */

import { Project, SyntaxKind, Node } from "ts-morph";
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Config {
  dryRun: boolean;
  apply: boolean;
  verify: boolean;
  rootDir: string;
}

interface MappingResult {
  file: string;
  changes: Array<{
    line: number;
    oldText: string;
    newText: string;
  }>;
}

const MANUAL_OVERRIDES_PATH = join(__dirname, "manual-overrides.json");

// Load manual overrides
const manualOverrides: Record<string, string> = JSON.parse(readFileSync(MANUAL_OVERRIDES_PATH, "utf-8"));

// Build canonical capability ID set from registry
const CAPABILITY_REGISTRY_PATH = join(__dirname, "..", "..", "packages", "auth", "capabilities.ts");
const registryContent = readFileSync(CAPABILITY_REGISTRY_PATH, "utf-8");
const canonicalCapabilityIds = new Set<string>();

// Extract capability IDs from registry (simple regex extraction)
const idMatches = registryContent.matchAll(/id:\s*"([^"]+)"/g);
for (const match of idMatches) {
  canonicalCapabilityIds.add(match[1]);
}

console.log(`Loaded ${canonicalCapabilityIds.size} canonical capability IDs from registry`);
console.log(`Loaded ${Object.keys(manualOverrides).length} manual overrides`);

// Build reverse mapping from old formats to canonical
function buildReverseMapping(): Map<string, string> {
  const mapping = new Map<string, string>();

  // Add manual overrides
  for (const [old, canonical] of Object.entries(manualOverrides)) {
    mapping.set(old, canonical);
  }

  // Add common patterns from DOT_TO_COLON_MAP in roles.ts
  const dotToColonMap: Record<string, string> = {
    "student.create": "academic.student.admissions",
    "marks.enter": "exam.marks.enter",
    "marks.approve": "exam.marks.enter",
    "academic.grade.create": "academic.classes.manage",
    "teacher.assign": "academic.classes.manage",
    "campus.approve": "academic.student.admissions",
  };

  for (const [dot, canonical] of Object.entries(dotToColonMap)) {
    mapping.set(dot, canonical);
    // Also add colon variant
    const colon = dot.replace(".", ":");
    mapping.set(colon, canonical);
  }

  return mapping;
}

const REVERSE_MAPPING = buildReverseMapping();

function isCanonicalFormat(str: string): boolean {
  // Canonical format: domain.resource.action (all lowercase, dots only)
  return /^[a-z]+\.[a-z]+\.[a-z]+$/.test(str);
}

function findCanonicalMapping(oldPermission: string): string | null {
  // Direct match in reverse mapping
  if (REVERSE_MAPPING.has(oldPermission)) {
    return REVERSE_MAPPING.get(oldPermission)!;
  }

  // Try normalizing common patterns
  const normalized = oldPermission
    .replace(/_/g, ".")
    .replace(/:/g, ".")
    .toLowerCase();

  if (REVERSE_MAPPING.has(normalized)) {
    return REVERSE_MAPPING.get(normalized)!;
  }

  // If it's already canonical, return as-is
  if (isCanonicalFormat(oldPermission)) {
    return oldPermission;
  }

  return null;
}

// Process TypeScript/TSX files using ts-morph
function processTypeScriptFiles(project: Project, config: Config): MappingResult[] {
  const results: MappingResult[] = [];

  const sourceFiles = project.getSourceFiles().filter((sf) => {
    const path = sf.getFilePath();
    return (
      (path.endsWith(".ts") || path.endsWith(".tsx")) &&
      !path.includes("node_modules") &&
      !path.includes(".next") &&
      !path.includes("__tests__") &&
      !path.includes(".d.ts")
    );
  });

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();
    const changes: MappingResult["changes"] = [];

    // Find all string literals that might be permissions
    const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);

    for (const literal of stringLiterals) {
      const text = literal.getLiteralValue();

      // Skip if already canonical or not a permission-like string
      if (isCanonicalFormat(text)) continue;
      if (!text.includes(".") && !text.includes(":") && !text.includes("_")) continue;
      if (text.length < 5 || text.length > 100) continue;

      const canonical = findCanonicalMapping(text);
      if (canonical && canonical !== text) {
        const line = literal.getStartLineNumber();
        changes.push({ line, oldText: text, newText: canonical });

        if (config.apply) {
          literal.setLiteralValue(canonical);
        }
      }
    }

    // Also check call expressions for requireAuth, can, hasPermission
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of callExpressions) {
      const expression = call.getExpression().getText();
      if (
        expression.includes("requireAuth") ||
        expression.includes("hasPermission") ||
        expression === "can"
      ) {
        const args = call.getArguments();
        for (const arg of args) {
          if (Node.isStringLiteral(arg)) {
            const text = arg.getLiteralValue();
            if (!isCanonicalFormat(text) && (text.includes(".") || text.includes(":") || text.includes("_"))) {
              const canonical = findCanonicalMapping(text);
              if (canonical && canonical !== text) {
                const line = arg.getStartLineNumber();
                changes.push({ line, oldText: text, newText: canonical });
                if (config.apply) {
                  arg.setLiteralValue(canonical);
                }
              }
            }
          }
        }
      }
    }

    if (changes.length > 0) {
      results.push({ file: relative(config.rootDir, filePath), changes });
      if (config.apply) {
        sourceFile.saveSync();
      }
    }
  }

  return results;
}

// Process Dart files using regex
function processDartFiles(config: Config): MappingResult[] {
  const results: MappingResult[] = [];
  const mobileAppDir = join(config.rootDir, "thaibahive_mobile_app", "lib");

  function walkDir(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...walkDir(fullPath));
      } else if (extname(entry) === ".dart") {
        files.push(fullPath);
      }
    }
    return files;
  }

  const dartFiles = walkDir(mobileAppDir);

  for (const filePath of dartFiles) {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const changes: MappingResult["changes"] = [];
    let modified = false;
    const newLines = [...lines];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match can('permission') or can("permission")
      const canMatches = line.matchAll(/can\(['"]([^'"]+)['"]\)/g);
      for (const match of canMatches) {
        const oldText = match[1];
        const canonical = findCanonicalMapping(oldText);
        if (canonical && canonical !== oldText) {
          changes.push({ line: i + 1, oldText, newText: canonical });
          newLines[i] = newLines[i].replace(`'${oldText}'`, `'${canonical}'`).replace(`"${oldText}"`, `"${canonical}"`);
          modified = true;
        }
      }

      // Match hasPermission(role, 'permission')
      const hasPermMatches = line.matchAll(/hasPermission\([^,]+,\s*['"]([^'"]+)['"]\)/g);
      for (const match of hasPermMatches) {
        const oldText = match[1];
        const canonical = findCanonicalMapping(oldText);
        if (canonical && canonical !== oldText) {
          changes.push({ line: i + 1, oldText, newText: canonical });
          newLines[i] = newLines[i].replace(`'${oldText}'`, `'${canonical}'`).replace(`"${oldText}"`, `"${canonical}"`);
          modified = true;
        }
      }
    }

    if (modified) {
      results.push({ file: relative(config.rootDir, filePath), changes });
      if (config.apply) {
        writeFileSync(filePath, newLines.join("\n"), "utf-8");
      }
    }
  }

  return results;
}

function printResults(results: MappingResult[], config: Config): void {
  let totalChanges = 0;
  for (const result of results) {
    if (result.changes.length === 0) continue;
    console.log(`\n📄 ${result.file} (${result.changes.length} changes)`);
    for (const change of result.changes) {
      console.log(`  Line ${change.line}: "${change.oldText}" → "${change.newText}"`);
      totalChanges++;
    }
  }
  console.log(`\n${config.apply ? "Applied" : "Preview"}: ${totalChanges} total changes across ${results.length} files`);
}

function verifyNoNonCanonical(config: Config): boolean {
  console.log("\n🔍 Verifying no non-canonical permission strings remain...");

  let hasViolations = false;

  // Check TypeScript files
  const project = new Project({
    tsConfigFilePath: join(config.rootDir, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
  });

  project.addSourceFilesAtPaths([
    join(config.rootDir, "src/**/*.ts"),
    join(config.rootDir, "src/**/*.tsx"),
    join(config.rootDir, "packages/**/*.ts"),
  ]);

  const tsFiles = project.getSourceFiles();
  for (const sf of tsFiles) {
    const literals = sf.getDescendantsOfKind(SyntaxKind.StringLiteral);
    for (const lit of literals) {
      const text = lit.getLiteralValue();
      if (
        (text.includes(":") || text.includes("_")) &&
        !isCanonicalFormat(text) &&
        text.length > 5 &&
        text.length < 100 &&
        /[a-zA-Z]/.test(text)
      ) {
        // Check if it's a known false positive (URLs, error messages, etc.)
        const falsePositives = [
          "http:", "https:", "mailto:", "tel:", "postgres:", "mongodb:",
          "error:", "warning:", "info:", "debug:",
          "rgb(", "rgba(", "hsl(", "hsla(",
          "var(", "calc(", "url(",
          "localhost:", "127.0.0.1:",
        ];
        if (falsePositives.some(fp => text.includes(fp))) continue;

        console.log(`  ❌ ${relative(config.rootDir, sf.getFilePath())}:${lit.getStartLineNumber()} - "${text}"`);
        hasViolations = true;
      }
    }
  }

  // Check Dart files
  const mobileAppDir = join(config.rootDir, "thaibahive_mobile_app", "lib");
  function walkDir(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...walkDir(fullPath));
      } else if (extname(entry) === ".dart") {
        files.push(fullPath);
      }
    }
    return files;
  }

  const dartFiles = walkDir(mobileAppDir);
  for (const filePath of dartFiles) {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const canMatches = line.matchAll(/can\(['"]([^'"]+)['"]\)/g);
      for (const match of canMatches) {
        const text = match[1];
        if (!isCanonicalFormat(text)) {
          console.log(`  ❌ ${relative(config.rootDir, filePath)}:${i + 1} - can("${text}")`);
          hasViolations = true;
        }
      }
    }
  }

  if (!hasViolations) {
    console.log("  ✅ All permission strings are in canonical format");
  }

  return !hasViolations;
}

async function main() {
  const args = process.argv.slice(2);
  const config: Config = {
    dryRun: args.includes("--dry-run"),
    apply: args.includes("--apply"),
    verify: args.includes("--verify"),
    rootDir: join(__dirname, "..", ".."),
  };

  if (!config.dryRun && !config.apply && !config.verify) {
    console.log("Usage: tsx scripts/codemod/canonical-permissions.ts [--dry-run|--apply|--verify]");
    process.exit(1);
  }

  console.log("🔧 Canonical Permission Codemod");
  console.log(`Mode: ${config.dryRun ? "DRY RUN" : config.apply ? "APPLY" : "VERIFY"}`);

  if (config.verify) {
    const success = verifyNoNonCanonical(config);
    process.exit(success ? 0 : 1);
  }

  const project = new Project({
    tsConfigFilePath: join(config.rootDir, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
  });

  project.addSourceFilesAtPaths([
    join(config.rootDir, "src/**/*.ts"),
    join(config.rootDir, "src/**/*.tsx"),
    join(config.rootDir, "packages/**/*.ts"),
  ]);

  console.log("\n📦 Processing TypeScript/TSX files...");
  const tsResults = processTypeScriptFiles(project, config);

  console.log("\n📱 Processing Dart files...");
  const dartResults = processDartFiles(config);

  const allResults = [...tsResults, ...dartResults];
  printResults(allResults, config);

  if (config.dryRun) {
    console.log("\n💡 Run with --apply to make changes, or --verify to check compliance");
  }
}

main().catch((err) => {
  console.error("❌ Codemod failed:", err);
  process.exit(1);
});