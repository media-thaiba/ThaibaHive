import * as sqliteSchema from "../../../packages/db/schema";
import * as pgSchema from "../../../packages/db/schema.pg";
import { isTable, getTableColumns } from "drizzle-orm";

describe("SQLite & PostgreSQL Production Schema Dialect Parity", () => {
  it("should have identical table definitions between SQLite and PostgreSQL schemas", () => {
    const sqliteTables: Record<string, any> = {};
    const pgTables: Record<string, any> = {};

    for (const [key, value] of Object.entries(sqliteSchema)) {
      if (isTable(value)) {
        sqliteTables[key] = value;
      }
    }

    for (const [key, value] of Object.entries(pgSchema)) {
      if (isTable(value)) {
        pgTables[key] = value;
      }
    }

    const sqliteTableNames = Object.keys(sqliteTables).sort();
    const pgTableNames = Object.keys(pgTables).sort();

    // Check missing tables
    const missingInPg = sqliteTableNames.filter((t) => !pgTableNames.includes(t));
    const missingInSqlite = pgTableNames.filter((t) => !sqliteTableNames.includes(t));

    expect(missingInPg).toEqual([]);
    expect(missingInSqlite).toEqual([]);
    expect(sqliteTableNames.length).toBeGreaterThan(50);
    expect(sqliteTableNames.length).toEqual(pgTableNames.length);
  });

  it("should have 100% column parity across all shared tables", () => {
    const mismatches: Array<{ table: string; missingInPg: string[]; missingInSqlite: string[] }> = [];

    for (const [tableName, sqliteTable] of Object.entries(sqliteSchema)) {
      if (!isTable(sqliteTable)) continue;

      const pgTable = (pgSchema as Record<string, any>)[tableName];
      if (!pgTable || !isTable(pgTable)) continue;

      const sqliteColumns = Object.keys(getTableColumns(sqliteTable)).sort();
      const pgColumns = Object.keys(getTableColumns(pgTable)).sort();

      const missingInPg = sqliteColumns.filter((c) => !pgColumns.includes(c));
      const missingInSqlite = pgColumns.filter((c) => !sqliteColumns.includes(c));

      if (missingInPg.length > 0 || missingInSqlite.length > 0) {
        mismatches.push({
          table: tableName,
          missingInPg,
          missingInSqlite,
        });
      }
    }

    expect(mismatches).toEqual([]);
  });
});
