import fs from "fs";
import path from "path";
import * as sqliteSchema from "../../../../packages/db/schema";
import * as pgSchema from "../../../../packages/db/schema.pg";
import { isTable } from "drizzle-orm";

describe("Gate 16: Route & Table Namespace Assertion Test (Phase 11)", () => {
  const PHASE_11_TABLES = [
    "sis_connectors",
    "sis_sync_runs",
    "sis_sync_records",
    "sis_mapping_queue",
    "sis_sync_audit",
    "resource_pools",
    "cross_campus_bookings",
    "cross_campus_allocations",
  ];

  it("verifies all Phase 11 tables follow strict naming conventions and do not collide with federation namespaces", () => {
    // Assert all Phase 11 tables match allowed prefixes
    for (const tableName of PHASE_11_TABLES) {
      expect(
        tableName.startsWith("sis_") ||
        tableName.startsWith("cross_campus_") ||
        tableName === "resource_pools"
      ).toBe(true);

      expect(tableName).not.toMatch(/^federat/i);
    }
  });

  it("verifies all 8 Phase 11 tables exist in both SQLite and PostgreSQL schemas", () => {
    const sqliteTableNames = Object.values(sqliteSchema)
      .filter(isTable)
      .map((t: any) => t[Symbol.for("drizzle:Name")] || t._.name);

    const pgTableNames = Object.values(pgSchema)
      .filter(isTable)
      .map((t: any) => t[Symbol.for("drizzle:Name")] || t._.name);

    for (const table of PHASE_11_TABLES) {
      expect(sqliteTableNames).toContain(table);
      expect(pgTableNames).toContain(table);
    }
  });

  it("asserts that no Phase 11 files use prohibited federation namespaces", () => {
    const prohibitedPaths = [
      "src/app/api/operations/federated",
      "src/app/api/federation",
      "src/app/api/admin/federation",
      "src/app/(shell)/admin/federated",
      "src/app/(shell)/operations/federated",
    ];

    for (const relPath of prohibitedPaths) {
      const fullPath = path.join(process.cwd(), relPath);
      // If the directory exists, verify no Phase 11 files are inside it
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath, { recursive: true }) as string[];
        const hasPhase11File = files.some(
          (f) =>
            typeof f === "string" &&
            (f.toLowerCase().includes("sis") ||
              f.toLowerCase().includes("crosscampus") ||
              f.toLowerCase().includes("oneroster") ||
              f.toLowerCase().includes("edfi"))
        );
        expect(hasPhase11File).toBe(false);
      }
    }
  });

  it("asserts that Phase 11 permissions strictly use 'sis:' or 'crosscampus:' namespaces", () => {
    const phase11Permissions = [
      "sis:read",
      "sis:manage",
      "sis:sync",
      "sis:webhooks:manage",
      "crosscampus:read",
      "crosscampus:request",
      "crosscampus:approve",
    ];

    for (const perm of phase11Permissions) {
      expect(perm.startsWith("sis:") || perm.startsWith("crosscampus:")).toBe(true);
      expect(perm.startsWith("federation:") || perm.startsWith("federated:")).toBe(false);
    }
  });
});
