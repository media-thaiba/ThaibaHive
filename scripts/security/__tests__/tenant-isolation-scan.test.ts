import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { runTenantScan } from "../tenant-isolation-scan";

describe("Tenant Isolation Scanner Security Rules & Fixtures", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tenant-scan-test-"));
    fs.mkdirSync(path.join(tmpDir, "packages/db"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "src/app/api/sample/[id]"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "src/app/api/admin/system"), { recursive: true });

    // Minimal dummy schema with scoped table
    const dummySchema = `
      import { sqliteTable, text } from "drizzle-orm/sqlite-core";
      export const mockScopedTable = sqliteTable("mock_scoped", {
        id: text("id").primaryKey(),
        institutionId: text("institution_id"),
      });
    `;
    fs.writeFileSync(path.join(tmpDir, "packages/db/schema.ts"), dummySchema, "utf8");
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects UNSCOPED_MUTATION when a scoped table is mutated without resolver", () => {
    const unScopingCode = `
      import { db } from "@/db";
      import { mockScopedTable } from "@/db/schema";
      import { eq } from "drizzle-orm";

      export async function DELETE(req, { params }) {
        await db.delete(mockScopedTable).where(eq(mockScopedTable.id, params.id)).run();
      }
    `;
    const targetFile = path.join(tmpDir, "src/app/api/sample/[id]/route.ts");
    fs.writeFileSync(targetFile, unScopingCode, "utf8");

    const report = runTenantScan({ rootDir: tmpDir, files: [targetFile] });
    expect(report.passed).toBe(false);
    expect(report.criticalCount).toBeGreaterThan(0);
    const mutationFinding = report.findings.find((f) => f.rule === "UNSCOPED_MUTATION");
    expect(mutationFinding).toBeDefined();
    expect(mutationFinding?.severity).toBe("CRITICAL");
  });

  it("detects INSERT_WITHOUT_INSTITUTION when insert values omit institutionId", () => {
    const insertMissingInstCode = `
      import { db } from "@/db";
      import { mockScopedTable } from "@/db/schema";
      import { resolveScopedInstitutionId } from "@/lib/auth";

      export async function POST(req) {
        await db.insert(mockScopedTable).values({
          id: "123",
        }).run();
      }
    `;
    const targetFile = path.join(tmpDir, "src/app/api/sample/route.ts");
    fs.writeFileSync(targetFile, insertMissingInstCode, "utf8");

    const report = runTenantScan({ rootDir: tmpDir, files: [targetFile] });
    expect(report.passed).toBe(false);
    expect(report.highCount).toBeGreaterThan(0);
    const insertFinding = report.findings.find((f) => f.rule === "INSERT_WITHOUT_INSTITUTION");
    expect(insertFinding).toBeDefined();
    expect(insertFinding?.severity).toBe("HIGH");
  });

  it("allows unscoped mutations in allowlisted paths as INFO debt", () => {
    const systemAdminCode = `
      import { db } from "@/db";
      import { mockScopedTable } from "@/db/schema";
      import { eq } from "drizzle-orm";

      export async function DELETE(req, { params }) {
        await db.delete(mockScopedTable).where(eq(mockScopedTable.id, params.id)).run();
      }
    `;
    const targetFile = path.join(tmpDir, "src/app/api/admin/system/route.ts");
    fs.writeFileSync(targetFile, systemAdminCode, "utf8");

    const report = runTenantScan({ rootDir: tmpDir, files: [targetFile] });
    expect(report.passed).toBe(true);
    expect(report.criticalCount).toBe(0);
    expect(report.allowlistedCount).toBeGreaterThan(0);
  });
});
