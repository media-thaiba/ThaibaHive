import { isTable, getTableColumns } from "drizzle-orm";
import * as sqliteSchema from "../../packages/db/schema";
import * as pgSchema from "../../packages/db/schema.pg";

export function checkSchemaParity(): { failures: number; warnings: number } {
  let failures = 0;
  let warnings = 0;

  const sqliteEntries = Object.entries(sqliteSchema);
  const pgRecord = pgSchema as Record<string, unknown>;

  console.log("[schema:parity] Checking table & column parity between SQLite and PostgreSQL schemas...");

  let tableCount = 0;
  for (const [tableKey, sqliteTable] of sqliteEntries) {
    if (!isTable(sqliteTable)) continue;
    tableCount++;

    const pgTable = pgRecord[tableKey];
    if (!pgTable || !isTable(pgTable)) {
      console.error(`[schema:parity] ❌ Table '${tableKey}' exists in schema.ts but is missing in schema.pg.ts`);
      failures++;
      continue;
    }

    const sCols = getTableColumns(sqliteTable as any) as Record<string, any>;
    const pCols = getTableColumns(pgTable as any) as Record<string, any>;

    const sColKeys = Object.keys(sCols);
    const pColKeys = Object.keys(pCols);

    for (const colKey of sColKeys) {
      if (!pCols[colKey]) {
        console.error(`[schema:parity] ❌ Column '${tableKey}.${colKey}' missing in PostgreSQL schema`);
        failures++;
      }
    }

    for (const colKey of pColKeys) {
      if (!sCols[colKey]) {
        console.warn(`[schema:parity] ⚠️ Column '${tableKey}.${colKey}' present in PostgreSQL but not SQLite`);
        warnings++;
      }
    }
  }

  console.log(`[schema:parity] Scanned ${tableCount} tables. Failures: ${failures}, Warnings: ${warnings}`);
  return { failures, warnings };
}

const isMainModule = typeof require !== "undefined"
  ? require.main === module
  : process.argv[1]?.includes("check-schema-parity");

if (isMainModule || process.argv[1]?.includes("check-schema-parity")) {
  const { failures } = checkSchemaParity();
  process.exit(failures > 0 ? 1 : 0);
}
