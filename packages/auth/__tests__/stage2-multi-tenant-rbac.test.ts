/**
 * @jest-environment node
 *
 * Stage 2: Multi-Tenant RBAC, Scope Isolation & Privilege Escalation Guards
 * Verification Suite (C2.1 – C2.10)
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { execSync } from "child_process";
import path from "path";
import {
  resolveScopedInstitutionId,
  resolveRequestInstitution,
  getUserInstitutionScope,
  TenantMismatchError,
  canCreateRole,
  canMutateStaff,
  getRoleRank,
  ROLE_RANK_MAP,
  createActionStepUpToken,
  verifyActionStepUpToken,
  consumeStepUpTokenInTx,
  isStepUpReplayError,
  createSession,
  verifySession,
  type SessionPayload,
} from "../index";
import { canAccessStaff } from "@/lib/auth/department-scope";
import { PUT as staffPut, PATCH as staffPatch, DELETE as staffDelete } from "@/app/api/staff/[id]/route";
import { POST as staffPost } from "@/app/api/staff/route";
import { db } from "@/db";
import { staff, institutions, departments, staffInstitutions, staffDepartments, userSessions, stepUpUsed } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

const activeCookieMap = new Map<string, string>();
const activeHeaderMap = new Map<string, string>();

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    get: jest.fn((name: string) => {
      const val = activeCookieMap.get(name);
      return val ? { value: val } : undefined;
    }),
    set: jest.fn((name: string, value: string) => {
      activeCookieMap.set(name, value);
    }),
    delete: jest.fn((name: string) => {
      activeCookieMap.delete(name);
    }),
  })),
  headers: jest.fn(async () => ({
    get: jest.fn((name: string) => activeHeaderMap.get(name.toLowerCase()) || null),
  })),
}));

describe("Stage 2: Multi-Tenant RBAC & Privilege Escalation Guards (C2.1 – C2.10)", () => {
  const ts = Date.now();
  const instA = `inst_stg2_a_${ts}`;
  const instB = `inst_stg2_b_${ts}`;
  const instC = `inst_stg2_c_${ts}`;

  const deptMedia = `dept_media_${ts}`;
  const deptFinance = `dept_fin_${ts}`;

  const superAdminId = `staff_sa_${ts}`;
  const regionalAdminId = `staff_ra_${ts}`;
  const unmappedRegionalAdminId = `staff_ra_unm_${ts}`;
  const principalAId = `staff_prin_a_${ts}`;
  const principalBId = `staff_prin_b_${ts}`;
  const adminAId = `staff_adm_a_${ts}`;
  const adminA2Id = `staff_adm_a2_${ts}`;
  const hodMediaId = `staff_hod_med_${ts}`;
  const teacherA1Id = `staff_tch_a1_${ts}`;
  const teacherA2Id = `staff_tch_a2_${ts}`;
  const staffUnmappedId = `staff_unmapped_${ts}`;

  beforeAll(async () => {
    // 1. Seed Institutions
    await db.insert(institutions).values([
      { id: instA, name: "Institution Alpha", code: `INA_${ts}`, isActive: true },
      { id: instB, name: "Institution Beta", code: `INB_${ts}`, isActive: true },
      { id: instC, name: "Institution Gamma", code: `INC_${ts}`, isActive: true },
    ]).run();

    // 2. Seed Staff
    await db.insert(staff).values([
      { id: superAdminId, email: `sa_${ts}@thaiba.org`, employeeId: `EMP_SA_${ts}`, firstName: "Super", lastName: "Admin", role: "super_admin", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: regionalAdminId, email: `ra_${ts}@thaiba.org`, employeeId: `EMP_RA_${ts}`, firstName: "Regional", lastName: "Admin", role: "regional_admin", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: unmappedRegionalAdminId, email: `ra_unm_${ts}@thaiba.org`, employeeId: `EMP_RAU_${ts}`, firstName: "Unmapped", lastName: "Regional", role: "regional_admin", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: principalAId, email: `prin_a_${ts}@thaiba.org`, employeeId: `EMP_PRA_${ts}`, firstName: "Principal", lastName: "Alpha", role: "principal", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: principalBId, email: `prin_b_${ts}@thaiba.org`, employeeId: `EMP_PRB_${ts}`, firstName: "Principal", lastName: "Beta", role: "principal", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: adminAId, email: `adm_a_${ts}@thaiba.org`, employeeId: `EMP_ADA_${ts}`, firstName: "Admin", lastName: "Alpha", role: "admin", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: adminA2Id, email: `adm_a2_${ts}@thaiba.org`, employeeId: `EMP_ADA2_${ts}`, firstName: "Admin2", lastName: "Alpha", role: "admin", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: hodMediaId, email: `hod_med_${ts}@thaiba.org`, employeeId: `EMP_HOD_${ts}`, firstName: "HOD", lastName: "Media", role: "hod", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: teacherA1Id, email: `tch_a1_${ts}@thaiba.org`, employeeId: `EMP_TCH1_${ts}`, firstName: "Teacher", lastName: "Media", role: "staff", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: teacherA2Id, email: `tch_a2_${ts}@thaiba.org`, employeeId: `EMP_TCH2_${ts}`, firstName: "Teacher", lastName: "Finance", role: "staff", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: staffUnmappedId, email: `unm_${ts}@thaiba.org`, employeeId: `EMP_UNM_${ts}`, firstName: "Unmapped", lastName: "Staff", role: "staff", isActive: true, tokenVersion: 0, isFirstLogin: false },
    ]).run();

    // 3. Seed Departments (with headUserId)
    await db.insert(departments).values([
      { id: deptMedia, institutionId: instA, name: "Media & Tech", code: `MED_${ts}`, headUserId: hodMediaId },
      { id: deptFinance, institutionId: instA, name: "Finance", code: `FIN_${ts}` },
    ]).run();

    // 4. Seed Staff Institutions
    await db.insert(staffInstitutions).values([
      { id: `si_ra_a_${ts}`, staffId: regionalAdminId, institutionId: instA },
      { id: `si_ra_b_${ts}`, staffId: regionalAdminId, institutionId: instB },
      { id: `si_prin_a_${ts}`, staffId: principalAId, institutionId: instA },
      { id: `si_prin_b_${ts}`, staffId: principalBId, institutionId: instB },
      { id: `si_adm_a_${ts}`, staffId: adminAId, institutionId: instA },
      { id: `si_adm_a2_${ts}`, staffId: adminA2Id, institutionId: instA },
      { id: `si_hod_${ts}`, staffId: hodMediaId, institutionId: instA },
      { id: `si_tch1_${ts}`, staffId: teacherA1Id, institutionId: instA },
      { id: `si_tch2_${ts}`, staffId: teacherA2Id, institutionId: instA },
    ]).run();

    // 5. Seed Staff Departments
    await db.insert(staffDepartments).values([
      { id: `sd_hod_${ts}`, staffId: hodMediaId, departmentId: deptMedia, isPrimary: true },
      { id: `sd_tch1_${ts}`, staffId: teacherA1Id, departmentId: deptMedia, isPrimary: true },
      { id: `sd_tch2_${ts}`, staffId: teacherA2Id, departmentId: deptFinance, isPrimary: true },
    ]).run();
  });

  afterAll(async () => {
    // Cleanup seeded test records
    await db.delete(userSessions).where(sql`${userSessions.email} LIKE ${`%_${ts}@thaiba.org`}`).run();
    await db.delete(stepUpUsed).where(sql`${stepUpUsed.staffId} LIKE ${`%_${ts}`}`).run();
    await db.delete(staffInstitutions).where(sql`${staffInstitutions.id} LIKE ${`%_${ts}`}`).run();
    await db.delete(staffDepartments).where(sql`${staffDepartments.id} LIKE ${`%_${ts}`}`).run();
    await db.delete(departments).where(sql`${departments.id} LIKE ${`%_${ts}`}`).run();
    await db.delete(staff).where(sql`${staff.id} LIKE ${`%_${ts}`}`).run();
    await db.delete(institutions).where(sql`${institutions.id} LIKE ${`%_${ts}`}`).run();
  });

  // ─── C2.1: Tenant Scope Resolution — Tier 3/4/5 Pinning ──────────────────────
  describe("C2.1: Tenant Scope Resolution — Tier 3/4/5 Pinning", () => {
    it("safely resolves to caller institution when requested is omitted", async () => {
      const session = {
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
      };
      const resolved = await resolveScopedInstitutionId(null, session as unknown as SessionPayload);
      expect(resolved).toBe(instA);
    });

    it("rejects caller with 403 TenantMismatchError when requesting a foreign institution", async () => {
      const session = {
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
      };
      await expect(resolveScopedInstitutionId(instB, session as unknown as SessionPayload)).rejects.toThrow(TenantMismatchError);
    });

    it("accepts when requested institution matches caller assigned institution", async () => {
      const session = {
        staffId: adminAId,
        role: "admin",
        institutionId: instA,
      };
      const resolved = await resolveScopedInstitutionId(instA, session as unknown as SessionPayload);
      expect(resolved).toBe(instA);
    });
  });

  // ─── C2.2: Fail-Closed Null Tenant ───────────────────────────────────────────
  describe("C2.2: Fail-Closed Null Tenant", () => {
    it("fails closed with 403 TenantMismatchError when non-super_admin has null institutionId and no memberships", async () => {
      const session = {
        staffId: staffUnmappedId,
        role: "staff",
        institutionId: null,
      };
      await expect(resolveScopedInstitutionId(instA, session as unknown as SessionPayload)).rejects.toThrow(TenantMismatchError);
      await expect(resolveRequestInstitution(session as unknown as SessionPayload, instA)).rejects.toThrow(TenantMismatchError);
    });
  });

  // ─── C2.3: Regional Admin Cluster Boundary ──────────────────────────────────
  describe("C2.3: Regional Admin Cluster Boundary", () => {
    it("allows regional_admin to access institutions in their assigned cluster", async () => {
      const session = {
        staffId: regionalAdminId,
        role: "regional_admin",
        institutionId: null,
      };
      expect(await resolveScopedInstitutionId(instA, session as unknown as SessionPayload)).toBe(instA);
      expect(await resolveScopedInstitutionId(instB, session as unknown as SessionPayload)).toBe(instB);
    });

    it("rejects regional_admin with 403 TenantMismatchError when accessing institution outside cluster", async () => {
      const session = {
        staffId: regionalAdminId,
        role: "regional_admin",
        institutionId: null,
      };
      await expect(resolveScopedInstitutionId(instC, session as unknown as SessionPayload)).rejects.toThrow(TenantMismatchError);
    });

    it("fails closed when regional_admin has an empty cluster", async () => {
      const session = {
        staffId: unmappedRegionalAdminId,
        role: "regional_admin",
        institutionId: null,
      };
      await expect(resolveScopedInstitutionId(instA, session as unknown as SessionPayload)).rejects.toThrow(TenantMismatchError);
    });
  });

  // ─── C2.4: Super Admin Explicit Context Switching ────────────────────────────
  describe("C2.4: Super Admin Explicit Context Switching", () => {
    it("allows super_admin to switch context to any institution or global scope", async () => {
      const session = {
        staffId: superAdminId,
        role: "super_admin",
        institutionId: "global",
      };
      expect(await resolveScopedInstitutionId(instA, session as unknown as SessionPayload)).toBe(instA);
      expect(await resolveScopedInstitutionId(instB, session as unknown as SessionPayload)).toBe(instB);
      expect(await resolveScopedInstitutionId(instC, session as unknown as SessionPayload)).toBe(instC);
      expect(await resolveScopedInstitutionId(null, session as unknown as SessionPayload, { allowGlobal: true })).toBe("global");
    });
  });

  // ─── C2.5: Role Escalation Ceiling — Target New Rank ────────────────────────
  describe("C2.5: Role Escalation Ceiling — Target New Rank", () => {
    it("blocks principal from creating equal or higher rank roles (principal, regional_admin, super_admin, system)", () => {
      expect(canCreateRole("principal", "super_admin")).toBe(false);
      expect(canCreateRole("principal", "regional_admin")).toBe(false);
      expect(canCreateRole("principal", "principal")).toBe(false);
      expect(canCreateRole("principal", "system" as unknown as Parameters<typeof canCreateRole>[1])).toBe(false);
    });

    it("allows principal to create strictly subordinate roles (hod, coordinator, admin, staff)", () => {
      expect(canCreateRole("principal", "hod")).toBe(true);
      expect(canCreateRole("principal", "coordinator")).toBe(true);
      expect(canCreateRole("principal", "admin")).toBe(true);
      expect(canCreateRole("principal", "accounts")).toBe(true);
      expect(canCreateRole("principal", "purchase")).toBe(true);
      expect(canCreateRole("principal", "staff")).toBe(true);
    });

    it("blocks admin from creating admin or any role above admin", () => {
      expect(canCreateRole("admin", "admin")).toBe(false);
      expect(canCreateRole("admin", "principal")).toBe(false);
      expect(canCreateRole("admin", "super_admin")).toBe(false);
      expect(canCreateRole("admin", "staff")).toBe(true);
    });
  });

  // ─── C2.6: Peer/Superior Protection — Target Current Rank ───────────────────
  describe("C2.6: Peer/Superior Protection — Target Current Rank", () => {
    it("blocks admin from modifying another admin, hod, principal, or super_admin", () => {
      expect(canMutateStaff("admin", "admin")).toBe(false);
      expect(canMutateStaff("admin", "hod")).toBe(false);
      expect(canMutateStaff("admin", "principal")).toBe(false);
      expect(canMutateStaff("admin", "super_admin")).toBe(false);
      expect(canMutateStaff("admin", "staff")).toBe(true);
    });

    it("blocks principal from modifying another principal, regional_admin, or super_admin", () => {
      expect(canMutateStaff("principal", "principal")).toBe(false);
      expect(canMutateStaff("principal", "regional_admin")).toBe(false);
      expect(canMutateStaff("principal", "super_admin")).toBe(false);
      expect(canMutateStaff("principal", "admin")).toBe(true);
      expect(canMutateStaff("principal", "hod")).toBe(true);
    });

    it("blocks super_admin from modifying system role account", () => {
      expect(canMutateStaff("super_admin", "system" as unknown as Parameters<typeof canMutateStaff>[1])).toBe(false);
    });
  });

  // ─── C2.7: Self-Role / Self-Tenant Mutation Block ────────────────────────────
  describe("C2.7: Self-Role / Self-Tenant Mutation Block", () => {
    it("rejects attempt to modify role on self-account via PUT with HTTP 403", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: adminAId,
        role: "admin",
        email: `adm_a_${ts}@thaiba.org`,
        employeeId: `EMP_ADA_${ts}`,
        name: "Admin Alpha",
        tokenVersion: 0,
        institutionId: instA,
      });

      const req = new Request(`http://localhost/api/staff/${adminAId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "super_admin",
          firstName: "Escalated",
        }),
      });

      const res = await staffPut(req, { params: Promise.resolve({ id: adminAId }) } as unknown as { params: Promise<{ id: string }> });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Cannot modify role, institution, department, or active status on your own account");
      activeCookieMap.clear();
    });

    it("rejects attempt to modify institutionIds on self-account via PATCH with HTTP 403", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: adminAId,
        role: "admin",
        email: `adm_a_${ts}@thaiba.org`,
        employeeId: `EMP_ADA_${ts}`,
        name: "Admin Alpha",
        tokenVersion: 0,
        institutionId: instA,
      });

      const req = new Request(`http://localhost/api/staff/${adminAId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institutionIds: [instB],
        }),
      });

      const res = await staffPatch(req, { params: Promise.resolve({ id: adminAId }) } as unknown as { params: Promise<{ id: string }> });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Cannot modify role, institution, department, or active status on your own account");
      activeCookieMap.clear();
    });
  });

  // ─── C2.8: HOD Department Isolation ─────────────────────────────────────────
  describe("C2.8: HOD Department Isolation", () => {
    it("allows HOD to access staff in their managed department", async () => {
      const canAccess = await canAccessStaff(hodMediaId, "hod", teacherA1Id);
      expect(canAccess).toBe(true);
    });

    it("denies HOD from accessing staff in a different department within the same institution", async () => {
      const canAccess = await canAccessStaff(hodMediaId, "hod", teacherA2Id);
      expect(canAccess).toBe(false);
    });

    it("denies HOD from accessing staff in a different institution", async () => {
      const canAccess = await canAccessStaff(hodMediaId, "hod", principalBId);
      expect(canAccess).toBe(false);
    });
  });

  // ─── C2.9: Atomic Session & tokenVersion Revocation on Role Change ────────────
  describe("C2.9: Atomic Session & tokenVersion Revocation on Role Change", () => {
    it("atomically bumps tokenVersion and terminates user_sessions when staff role changes", async () => {
      // 1. Create real signed session for teacherA1
      activeCookieMap.clear();
      await createSession({
        staffId: teacherA1Id,
        role: "staff",
        email: `tch_a1_${ts}@thaiba.org`,
        employeeId: `EMP_TCH1_${ts}`,
        name: "Teacher Media",
        tokenVersion: 0,
        institutionId: instA,
      });

      // Assert session is active and verified by database check
      const sessionBefore = await verifySession();
      expect(sessionBefore).not.toBeNull();
      expect(sessionBefore?.staffId).toBe(teacherA1Id);
      expect(sessionBefore?.tokenVersion).toBe(0);

      const initialStaff = await db.select({ tokenVersion: staff.tokenVersion }).from(staff).where(eq(staff.id, teacherA1Id)).get();
      expect(initialStaff?.tokenVersion).toBe(0);

      // Principal A mutates teacherA1 to role 'coordinator' in transaction
      const stepUpToken = await createActionStepUpToken({
        staffId: principalAId,
        sid: `sess_prin_${ts}`,
        action: "staff:role:change",
      });

      await db.transaction(async (tx) => {
        const verifyRes = await verifyActionStepUpToken(stepUpToken, {
          staffId: principalAId,
          sid: `sess_prin_${ts}`,
          action: "staff:role:change",
        });
        expect(verifyRes.success).toBe(true);
        if (!verifyRes.success) return;

        await consumeStepUpTokenInTx(tx, {
          jti: verifyRes.payload.jti,
          staffId: principalAId,
          action: verifyRes.payload.action,
          exp: verifyRes.exp,
        });

        await tx.update(staff).set({ role: "coordinator" }).where(eq(staff.id, teacherA1Id)).run();
        await tx.update(staff).set({ tokenVersion: sql`${staff.tokenVersion} + 1` }).where(eq(staff.id, teacherA1Id)).run();
        await tx.update(userSessions).set({ status: "terminated", logoutAt: Date.now() })
          .where(and(eq(userSessions.staffId, teacherA1Id), eq(userSessions.status, "active"))).run();
      });

      // Verify tokenVersion incremented in DB
      const updatedStaff = await db.select({ role: staff.role, tokenVersion: staff.tokenVersion }).from(staff).where(eq(staff.id, teacherA1Id)).get();
      expect(updatedStaff?.role).toBe("coordinator");
      expect(updatedStaff?.tokenVersion).toBe(1);

      // Verify session terminated in user_sessions DB table
      const sessionRecords = await db.select({ status: userSessions.status }).from(userSessions).where(eq(userSessions.staffId, teacherA1Id)).all();
      expect(sessionRecords.length).toBeGreaterThan(0);
      for (const rec of sessionRecords) {
        expect(rec.status).toBe("terminated");
      }

      // CRITICAL C2.9 INVARIANT: verifySession() must now return NULL due to tokenVersion mismatch + terminated status
      const sessionAfter = await verifySession();
      expect(sessionAfter).toBeNull();

      activeCookieMap.clear();
    });
  });

  // ─── C2.10: Step-Up Replay Protection & PGlite Parity ────────────────────────
  describe("C2.10: Step-Up Replay Protection & PGlite Parity", () => {
    it("rejects replayed step-up token on LibSQL with isStepUpReplayError === true", async () => {
      const stepUpToken = await createActionStepUpToken({
        staffId: principalAId,
        sid: `sess_prin_replay_${ts}`,
        action: "staff:mutate",
      });

      const verifyRes = await verifyActionStepUpToken(stepUpToken, {
        staffId: principalAId,
        sid: `sess_prin_replay_${ts}`,
        action: "staff:mutate",
      });
      expect(verifyRes.success).toBe(true);
      if (!verifyRes.success) return;

      // First consumption succeeds
      await db.transaction(async (tx) => {
        await consumeStepUpTokenInTx(tx, {
          jti: verifyRes.payload.jti,
          staffId: principalAId,
          action: verifyRes.payload.action,
          exp: verifyRes.exp,
        });
      });

      // Second consumption fails with replay constraint error
      let replayCaught = false;
      try {
        await db.transaction(async (tx) => {
          await consumeStepUpTokenInTx(tx, {
            jti: verifyRes.payload.jti,
            staffId: principalAId,
            action: verifyRes.payload.action,
            exp: verifyRes.exp,
          });
        });
      } catch (err: unknown) {
        replayCaught = isStepUpReplayError(err);
      }
      expect(replayCaught).toBe(true);
    });

    it("executes Stage 2 Postgres / PGlite verification runner with 100% parity", () => {
      const runnerPath = path.resolve(__dirname, "stage2-pglite-runner.ts");
      const output = execSync(`npx tsx "${runnerPath}"`, {
        encoding: "utf-8",
        env: {
          ...process.env,
          NODE_ENV: "test",
          AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || "stage2-test-auth-jwt-secret-at-least-32-chars-long",
        },
      });

      expect(output).toContain("PASS Test 1: Atomic role change, tokenVersion bump, and session termination on Postgres");
      expect(output).toContain("PASS Test 2: Step-up token replay on Postgres caught and identified by isStepUpReplayError (code 23505)");
      expect(output).toContain("PASS Test 3: Subordinate rank hierarchy and system role immunity verified on Postgres");
      expect(output).toContain("=== All Stage 2 Postgres/PGlite verification tests passed! ===");
    });
  });
});
