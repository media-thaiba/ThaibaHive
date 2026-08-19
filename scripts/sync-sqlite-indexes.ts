import fs from "fs";
import path from "path";

function extractIndexes(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  // Regex to match index("name") or index('name')
  const regex = /index\(['"]([^'"]+)['"]\)/g;
  const indexNames: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    indexNames.push(match[1]);
  }

  return indexNames;
}

// Normalize index name to allow comparison across dialect suffixes (e.g. _pg, idx_pg_)
function normalizeIndexName(name: string): string {
  return name
    .toLowerCase()
    .replace(/_pg$/, "")
    .replace(/^idx_pg_/, "idx_")
    .replace(/_idx$/, "_idx")
    .trim();
}

function checkIndexParity() {
  const rootDir = process.cwd();
  const sqliteSchemaPath = path.join(rootDir, "packages/db/schema.ts");
  const pgSchemaPath = path.join(rootDir, "packages/db/schema.pg.ts");

  console.log("[Index Parity Sync] Checking schema index parity between SQLite and PostgreSQL...");

  if (!fs.existsSync(sqliteSchemaPath)) {
    console.error(`[Error] SQLite schema file not found at: ${sqliteSchemaPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(pgSchemaPath)) {
    console.error(`[Error] PostgreSQL schema file not found at: ${pgSchemaPath}`);
    process.exit(1);
  }

  const sqliteIndexes = extractIndexes(sqliteSchemaPath);
  const pgIndexes = extractIndexes(pgSchemaPath);

  const sqliteNormalized = sqliteIndexes.map(normalizeIndexName);
  const pgNormalized = pgIndexes.map(normalizeIndexName);

  console.log(`[Index Parity Sync] Found ${sqliteIndexes.length} indexes in SQLite schema.`);
  console.log(`[Index Parity Sync] Found ${pgIndexes.length} indexes in PostgreSQL schema.`);

  // Find duplicates in SQLite
  const sqliteDuplicates = sqliteIndexes.filter((item, index) => sqliteIndexes.indexOf(item) !== index);
  if (sqliteDuplicates.length > 0) {
    console.warn(`[Warning] Found duplicate index declarations in SQLite schema:`, Array.from(new Set(sqliteDuplicates)));
  }

  // Find duplicates in PostgreSQL
  const pgDuplicates = pgIndexes.filter((item, index) => pgIndexes.indexOf(item) !== index);
  if (pgDuplicates.length > 0) {
    console.warn(`[Warning] Found duplicate index declarations in PostgreSQL schema:`, Array.from(new Set(pgDuplicates)));
  }

  // Find missing in SQLite (defined in PG but not in SQLite, comparison using normalized names)
  const missingInSqlite = pgIndexes.filter((idx) => !sqliteNormalized.includes(normalizeIndexName(idx)));
  // Find missing in PG (defined in SQLite but not in PG)
  const missingInPg = sqliteIndexes.filter((idx) => !pgNormalized.includes(normalizeIndexName(idx)));

  let hasMismatch = false;

  if (missingInSqlite.length > 0) {
    console.error(`[Error] The following indexes exist in PostgreSQL schema but are missing in SQLite schema:`);
    missingInSqlite.forEach((idx) => console.error(`  - ${idx}`));
    hasMismatch = true;
  }

  if (missingInPg.length > 0) {
    console.warn(`[Warning] The following indexes exist in SQLite schema but have no equivalents in PostgreSQL schema:`);
    missingInPg.forEach((idx) => console.warn(`  - ${idx}`));
    // Do not fail the build for SQLite indexes that are optional/not yet in PG, but warn about them.
    // However, if critical indexes (e.g. swarm metrics, telemetry) are missing, we should flag.
    const criticalMissing = missingInPg.filter(idx => idx.includes("swarm") || idx.includes("remediation"));
    if (criticalMissing.length > 0) {
      console.error(`[Error] Critical observability indexes are missing in PostgreSQL:`);
      criticalMissing.forEach((idx) => console.error(`  - ${idx}`));
      hasMismatch = true;
    }
  }

  if (sqliteDuplicates.length > 0 || pgDuplicates.length > 0) {
    console.error("[Error] Duplicate index scripts must be cleaned up to ensure clean push commands.");
    hasMismatch = true;
  }

  if (hasMismatch) {
    console.error("[Index Parity Sync] ❌ Parity validation FAILED. Database schemas are out of sync.");
    process.exit(1);
  }

  console.log("[Index Parity Sync] ✅ Parity validation PASSED. Database indexes are fully synchronized.");
  process.exit(0);
}

checkIndexParity();
