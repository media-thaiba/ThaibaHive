import * as sqliteSchema from "../../../packages/db/schema";
import * as pgSchema from "../../../packages/db/schema.pg";
import { is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { SQLiteTable } from "drizzle-orm/sqlite-core";

describe("Schema Parity between SQLite and PostgreSQL", () => {
  it("should have 100% key parity for all exported database tables", () => {
    const sqliteKeys = Object.keys(sqliteSchema).filter(
      (key) => typeof (sqliteSchema as Record<string, unknown>)[key] === "object"
    );
    const pgKeys = Object.keys(pgSchema).filter(
      (key) => typeof (pgSchema as Record<string, unknown>)[key] === "object"
    );

    const missingInPg = sqliteKeys.filter((key) => !pgKeys.includes(key));
    const missingInSqlite = pgKeys.filter((key) => !sqliteKeys.includes(key));

    expect(missingInPg).toEqual([]);
    expect(missingInSqlite).toEqual([]);
    expect(sqliteKeys.sort()).toEqual(pgKeys.sort());
  });

  it("should verify every SQLite table is instantiated from SQLiteTable driver", () => {
    for (const [key, val] of Object.entries(sqliteSchema)) {
      if (val && typeof val === "object" && "_" in val) {
        expect(is(val, SQLiteTable)).toBe(true);
      }
    }
  });

  it("should verify every PostgreSQL table is instantiated from PgTable driver", () => {
    for (const [key, val] of Object.entries(pgSchema)) {
      if (val && typeof val === "object" && "_" in val) {
        expect(is(val, PgTable)).toBe(true);
      }
    }
  });
});

