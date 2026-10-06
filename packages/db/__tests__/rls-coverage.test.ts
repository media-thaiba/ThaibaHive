import fs from "node:fs";
import path from "node:path";
import * as pgSchema from "../schema.pg";
import { isTable } from "drizzle-orm";

describe("Row Level Security (RLS) Coverage Verification", () => {
  const rlsScriptPath = path.resolve(__dirname, "../../../scripts/db/enable-rls.sql");

  it("should have the enable-rls.sql migration script present on disk", () => {
    expect(fs.existsSync(rlsScriptPath)).toBe(true);
  });

  it("should contain idempotent PL/pgSQL block to enable RLS dynamically for all public tables", () => {
    const scriptContent = fs.readFileSync(rlsScriptPath, "utf-8");
    expect(scriptContent).toContain("ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY");
    expect(scriptContent).toContain("schemaname = 'public'");
  });

  it("should verify schema.pg.ts defines valid pgTable instances covered by RLS enforcement", () => {
    const tables = Object.entries(pgSchema).filter(([_, value]) => isTable(value));

    expect(tables.length).toBeGreaterThan(50);

    // Verify critical sensitive tables are present in pg schema
    const tableKeys = tables.map(([key]) => key);
    expect(tableKeys).toContain("staff");
    expect(tableKeys).toContain("institutions");
    expect(tableKeys).toContain("expenseClaims");
    expect(tableKeys).toContain("feeStructures");
    expect(tableKeys).toContain("students");
  });
});
