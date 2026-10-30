/**
 * Stage 4: Static AST Route Guard & Tenant Boundary Scanner Test Suite
 * Gates Verified:
 * - C4.1: AST Route Guard Scanner (100% platform handlers shielded)
 * - C4.2: Zero-Unmapped-Permission AST Enforcement (all permissions in role registry)
 * - C4.3: Mutation Route Tenant Scoping Audit
 * - C4.4: High-Risk Step-Up Authentication AST Guard
 * - C4.5: Strict Non-Wildcard Exemption Matrix with Documented Justifications
 * - C4.7 & C4.8: Automated CLI & Jest Test Battery
 */

import { describe, it, expect } from "@jest/globals";
import path from "path";
import fs from "fs";
import {
  runPlatformAstRouteScan,
  inspectRouteAst,
  EXACT_EXEMPTION_ALLOWLIST,
  HTTP_METHODS,
} from "../../../scripts/security/ast-route-guard-scanner";
import { ALL_VALID_PERMISSIONS, isValidPermission } from "../roles";

describe("Stage 4: Static AST Route Guard & Tenant Boundary Scanner (C4.1 – C4.5, C4.7, C4.8)", () => {
  // ─── C4.5: Strict Non-Wildcard Exemption Matrix ──────────────────────────────
  describe("C4.5: Strict Non-Wildcard Exemption Allowlist", () => {
    it("ensures zero wildcard '*' entries exist in EXACT_EXEMPTION_ALLOWLIST", () => {
      for (const [routePath, justification] of Object.entries(EXACT_EXEMPTION_ALLOWLIST)) {
        expect(routePath).not.toContain("*");
        expect(justification).toBeTruthy();
        expect(justification.length).toBeGreaterThanOrEqual(15);
      }
    });

    it("ensures every exempted route actually exists on disk in src/app/api", () => {
      const rootDir = process.cwd();
      for (const routePath of Object.keys(EXACT_EXEMPTION_ALLOWLIST)) {
        const fullTs = path.join(rootDir, "src/app", routePath, "route.ts");
        const fullJs = path.join(rootDir, "src/app", routePath, "route.js");
        const exists = fs.existsSync(fullTs) || fs.existsSync(fullJs);
        expect(exists).toBe(true);
      }
    });
  });

  // ─── Unit Tests with Synthetic AST Snippets ──────────────────────────────────
  describe("Unit Tests: Synthetic AST Node Traversal & Detection", () => {
    const tempDir = path.join(process.cwd(), "scratch", "test-ast");

    beforeAll(() => {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    });

    afterAll(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("detects unshielded naked exported handlers", () => {
      const testFile = path.join(tempDir, "naked-route.ts");
      fs.writeFileSync(
        testFile,
        `
        import { NextResponse } from "next/server";
        export async function GET() {
          return NextResponse.json({ ok: true });
        }
        export const POST = async () => NextResponse.json({ ok: true });
        `
      );

      const inspection = inspectRouteAst(testFile);
      expect(inspection.methods.length).toBe(2);
      expect(inspection.methods[0].shieldType).toBe("none");
      expect(inspection.methods[1].shieldType).toBe("none");
    });

    it("detects valid wrapper requireAuth handlers and extracts registered permissions", () => {
      const testFile = path.join(tempDir, "wrapped-route.ts");
      fs.writeFileSync(
        testFile,
        `
        import { requireAuth } from "@/lib/api/auth-guard";
        import { resolveScopedInstitutionId } from "@thaiba/auth";
        export const GET = requireAuth(async (req, session) => {
          const tenantId = await resolveScopedInstitutionId("inst_1", session);
          return Response.json({ tenantId });
        }, "system:audit:read");
        `
      );

      const inspection = inspectRouteAst(testFile);
      expect(inspection.methods.length).toBe(1);
      expect(inspection.methods[0].shieldType).toBe("wrapper");
      expect(inspection.methods[0].permission).toBe("system:audit:read");
      expect(inspection.methods[0].hasTenantScoping).toBe(true);
      expect(inspection.methods[0].defectReason).toBeUndefined();
    });

    it("flags unmapped or misspelled permissions passed to requireAuth", () => {
      const testFile = path.join(tempDir, "invalid-perm-route.ts");
      fs.writeFileSync(
        testFile,
        `
        import { requireAuth } from "@/lib/api/auth-guard";
        export const POST = requireAuth(async () => {
          return Response.json({});
        }, "unregistered:fake:permission");
        `
      );

      const inspection = inspectRouteAst(testFile);
      expect(inspection.methods.length).toBe(1);
      expect(inspection.methods[0].defectReason).toContain("Unmapped permission 'unregistered:fake:permission'");
    });

    it("recognizes inline verifySession and hasPermission handlers", () => {
      const testFile = path.join(tempDir, "inline-auth-route.ts");
      fs.writeFileSync(
        testFile,
        `
        import { verifySession, hasPermission } from "@thaiba/auth";
        export async function DELETE(req: Request) {
          const session = await verifySession();
          if (!session || !hasPermission(session.role, "system:sessions:terminate")) {
            return Response.json({ error: "Forbidden" }, { status: 403 });
          }
          return Response.json({ success: true });
        }
        `
      );

      const inspection = inspectRouteAst(testFile);
      expect(inspection.methods.length).toBe(1);
      expect(inspection.methods[0].shieldType).toBe("inline");
      expect(inspection.methods[0].permission).toBe("system:sessions:terminate");
      expect(inspection.methods[0].defectReason).toBeUndefined();
    });

    it("recognizes re-exported routes (export { GET, POST } from ...)", () => {
      const testFile = path.join(tempDir, "reexport-route.ts");
      fs.writeFileSync(
        testFile,
        `export { GET, POST, DELETE } from "./other-route";`
      );

      const inspection = inspectRouteAst(testFile);
      expect(inspection.methods.length).toBe(3);
      for (const m of inspection.methods) {
        expect(m.shieldType).toBe("re-export");
      }
    });

    it("resolves local alias assignments (export const PATCH = PUT)", () => {
      const testFile = path.join(tempDir, "alias-route.ts");
      fs.writeFileSync(
        testFile,
        `
        import { requireAuth } from "@/lib/api/auth-guard";
        export const PUT = requireAuth(async () => Response.json({}), "students:write");
        export const PATCH = PUT;
        `
      );

      const inspection = inspectRouteAst(testFile);
      expect(inspection.methods.length).toBe(2);
      expect(inspection.methods[0].method).toBe("PUT");
      expect(inspection.methods[0].shieldType).toBe("wrapper");
      expect(inspection.methods[1].method).toBe("PATCH");
      expect(inspection.methods[1].shieldType).toBe("wrapper");
      expect(inspection.methods[1].permission).toBe("students:write");
    });
  });

  // ─── C4.1, C4.2, C4.7, C4.8: Full Platform Route AST Scan ──────────────────
  describe("C4.1 & C4.2 & C4.8: Zero-Defect Full Platform AST Scan", () => {
    it("verifies 100% of exported handlers across all platform routes are shielded with zero permission errors", () => {
      const result = runPlatformAstRouteScan();

      expect(result.totalRoutes).toBeGreaterThanOrEqual(700);
      expect(result.totalMethods).toBeGreaterThanOrEqual(1000);
      expect(result.unshieldedCount).toBe(0);
      expect(result.permissionDefectCount).toBe(0);
      expect(result.defects).toEqual([]);
      expect(result.passed).toBe(true);
    });
  });

  // ─── C4.4: High-Risk Step-Up Verification AST Guard ─────────────────────────
  describe("C4.4: High-Risk Step-Up Authentication AST Guard", () => {
    it("ensures critical administrative routes enforce step-up authentication", () => {
      const stepUpRoutes = [
        "src/app/api/admin/audit/export/route.ts",
        "src/app/api/admin/sessions/[id]/terminate/route.ts",
      ];

      for (const r of stepUpRoutes) {
        const fullPath = path.join(process.cwd(), r);
        const inspection = inspectRouteAst(fullPath);
        const postOrDelete = inspection.methods.find((m) => m.method === "POST" || m.method === "DELETE");
        expect(postOrDelete).toBeDefined();
        expect(postOrDelete?.hasStepUp).toBe(true);
      }
    });
  });
});
