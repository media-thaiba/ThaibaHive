import * as sqliteSchema from "../schema";
import * as pgSchema from "../schema.pg";
import { getTableColumns, isTable } from "drizzle-orm";

describe("Database Schema Parity & Drift Quality Gate", () => {
  // Extract all table objects from both schemas
  const sqliteTables: Record<string, any> = {};
  for (const [key, val] of Object.entries(sqliteSchema)) {
    if (isTable(val)) {
      sqliteTables[key] = val;
    }
  }

  const pgTables: Record<string, any> = {};
  for (const [key, val] of Object.entries(pgSchema)) {
    if (isTable(val)) {
      pgTables[key] = val;
    }
  }

  const sqliteTableNames = Object.keys(sqliteTables).sort();
  const pgTableNames = Object.keys(pgTables).sort();

  it("exports the exact same set of tables across SQLite and PostgreSQL schemas", () => {
    const missingInPg = sqliteTableNames.filter((name) => !pgTableNames.includes(name));
    const missingInSqlite = pgTableNames.filter((name) => !sqliteTableNames.includes(name));

    expect(missingInPg).toEqual([]);
    expect(missingInSqlite).toEqual([]);
    expect(sqliteTableNames.length).toBeGreaterThan(300);
    expect(pgTableNames.length).toBe(sqliteTableNames.length);
  });

  it("verifies column name parity across all tables between SQLite and PostgreSQL", () => {
    const columnMismatches: { table: string; missingInPg: string[]; missingInSqlite: string[] }[] = [];

    for (const tableName of sqliteTableNames) {
      const sqliteTable = sqliteTables[tableName];
      const pgTable = pgTables[tableName];

      if (!sqliteTable || !pgTable) continue;

      const sqliteCols = Object.keys(getTableColumns(sqliteTable)).sort();
      const pgCols = Object.keys(getTableColumns(pgTable)).sort();

      const missingInPg = sqliteCols.filter((col) => !pgCols.includes(col));
      const missingInSqlite = pgCols.filter((col) => !sqliteCols.includes(col));

      if (missingInPg.length > 0 || missingInSqlite.length > 0) {
        columnMismatches.push({
          table: tableName,
          missingInPg,
          missingInSqlite,
        });
      }
    }

    expect(columnMismatches).toEqual([]);
  });
});
