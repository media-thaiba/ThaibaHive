import * as sqliteSchema from "../../../packages/db/schema";
import * as pgSchema from "../../../packages/db/schema.pg";

describe("TGCIS & Academic Multi-Campus Schema Parity (SQLite vs PostgreSQL)", () => {
  const tgcisTables = [
    "timetableSlots",
    "timetableEntries",
    "teacherSubstitutions",
    "studentEnquiries",
    "campusAffiliations",
    "circularCampusCompliance",
  ] as const;

  tgcisTables.forEach((tableName) => {
    it(`should verify ${tableName} table exists in both SQLite and PostgreSQL schemas`, () => {
      const sqliteTable = (sqliteSchema as Record<string, unknown>)[tableName];
      const pgTable = (pgSchema as Record<string, unknown>)[tableName];

      expect(sqliteTable).toBeDefined();
      expect(pgTable).toBeDefined();
    });

    it(`should verify ${tableName} has identical column names across SQLite and PostgreSQL`, () => {
      const sqliteTable = (sqliteSchema as Record<string, any>)[tableName];
      const pgTable = (pgSchema as Record<string, any>)[tableName];

      const sqliteColumns = Object.keys(sqliteTable)
        .filter((k) => !k.startsWith("_") && k !== "enableRLS")
        .sort();
      const pgColumns = Object.keys(pgTable)
        .filter((k) => !k.startsWith("_") && k !== "enableRLS")
        .sort();

      expect(sqliteColumns).toEqual(pgColumns);
    });
  });
});
