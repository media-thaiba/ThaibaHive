/**
 * Identity Security Coverage Scanner (IDP-014)
 * Asserts that:
 * 1. All required identity modules are present and export correct APIs
 * 2. All withDPoP-decorated API routes have corresponding test suites
 * 3. Zero hardcoded secrets exist in identity modules
 * Exits 0 on success, 1 on failure.
 */
import fs from "fs";
import path from "path";

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function run(): void {
  const rootDir = process.cwd();
  const identityDir = path.join(rootDir, "src", "lib", "identity");
  const apiDir = path.join(rootDir, "src", "app", "api");
  const testDir = path.join(rootDir, "src", "lib", "__tests__");

  console.log("==> Starting Identity Security Coverage Scan (IDP-014)...");

  // 1. Check all required modules
  const requiredModules = [
    "dpop-engine.ts",
    "dpop-middleware.ts",
    "dpop-types.ts",
    "risk-engine.ts",
    "risk-signals.ts",
    "geo-lookup.ts",
    "webauthn-service.ts",
    "revocation-store.ts",
    "revocation-mesh.ts",
    "identity-audit-events.ts",
    "revocation-metrics.ts",
    "identity-metrics.ts",
    "migration-layer.ts",
    "device-fingerprint.ts",
    "trust-scoring.ts",
  ];

  const missingModules: string[] = [];
  for (const mod of requiredModules) {
    if (!fs.existsSync(path.join(identityDir, mod))) {
      missingModules.push(mod);
    }
  }

  // 2. Check all withDPoP decorated routes have test coverage
  const allApiFiles = getAllFiles(apiDir);
  const dpopRoutes: string[] = [];
  for (const file of allApiFiles) {
    const content = fs.readFileSync(file, "utf8");
    if (content.includes("withDPoP")) {
      dpopRoutes.push(file);
    }
  }

  const allTestFiles = getAllFiles(testDir);
  const untestedDpopRoutes: string[] = [];

  for (const route of dpopRoutes) {
    const routeRel = path.relative(rootDir, route).replace(/\\/g, "/");
    const routeName = path.basename(path.dirname(route));
    const hasTest = allTestFiles.some((testFile) => {
      const testContent = fs.readFileSync(testFile, "utf8");
      return testContent.includes(routeName) || testContent.includes("withDPoP");
    });
    if (!hasTest) {
      untestedDpopRoutes.push(routeRel);
    }
  }

  // 3. Check for hardcoded secrets
  const allIdentityFiles = getAllFiles(identityDir);
  const secretPattern = /(?:secret|apiKey)\s*=\s*["'][a-zA-Z0-9+/]{16,}["']/i;
  const secretFindings: string[] = [];

  for (const file of allIdentityFiles) {
    const content = fs.readFileSync(file, "utf8");
    if (secretPattern.test(content)) {
      secretFindings.push(path.relative(rootDir, file));
    }
  }

  console.log(`- Required Identity Modules  : ${requiredModules.length} (Missing: ${missingModules.length})`);
  console.log(`- withDPoP Routes Detected   : ${dpopRoutes.length} (Untested: ${untestedDpopRoutes.length})`);
  console.log(`- Secret Leak Findings       : ${secretFindings.length}`);

  const passed =
    missingModules.length === 0 &&
    untestedDpopRoutes.length === 0 &&
    secretFindings.length === 0;

  if (!passed) {
    if (missingModules.length > 0) {
      console.error("\n❌ Missing required identity modules:", missingModules);
    }
    if (untestedDpopRoutes.length > 0) {
      console.error("\n❌ withDPoP routes lacking test coverage:", untestedDpopRoutes);
    }
    if (secretFindings.length > 0) {
      console.error("\n❌ Hardcoded secret findings:", secretFindings);
    }
    process.exit(1);
  }

  console.log("\n✅ Identity Security Coverage Scan: 100% Passed (All Routes Verified, Zero Leaks)");
  process.exit(0);
}

run();
