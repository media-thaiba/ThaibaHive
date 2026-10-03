import {
  resolveInstitutionScopeForSession,
  resolveScopedInstitutionId,
  TenantMismatchError,
} from "../institution-scope";
import { db, staff, institutions, staffInstitutions } from "@thaiba/db";
import { inArray } from "drizzle-orm";

describe("Tenant Scope Fail-Closed & Multi-Tenant Enforcement (Task A2 / Blocker B3)", () => {
  const ts = Date.now();
  const instAlpha = `inst_alpha_${ts}`;
  const instBeta = `inst_beta_${ts}`;
  const instGamma = `inst_gamma_${ts}`;

  const staffUnmapped = `staff_unm_${ts}`;
  const staffAlpha = `staff_alp_${ts}`;
  const staffMulti = `staff_mul_${ts}`;
  const staffAdmin = `staff_adm_${ts}`;

  beforeAll(async () => {
    // Insert test institutions
    await db.insert(institutions).values([
      { id: instAlpha, name: "Campus Alpha", code: `alpha_${ts}` },
      { id: instBeta, name: "Campus Beta", code: `beta_${ts}` },
      { id: instGamma, name: "Campus Gamma", code: `gamma_${ts}` },
    ]).run();

    // Insert test staff
    await db.insert(staff).values([
      { id: staffUnmapped, email: `unm_${ts}@test.com`, employeeId: `EMP_UNM_${ts}`, firstName: "Unmapped", lastName: "Staff", role: "staff" },
      { id: staffAlpha, email: `alp_${ts}@test.com`, employeeId: `EMP_ALP_${ts}`, firstName: "Alpha", lastName: "Staff", role: "staff" },
      { id: staffMulti, email: `mul_${ts}@test.com`, employeeId: `EMP_MUL_${ts}`, firstName: "Multi", lastName: "Staff", role: "staff" },
      { id: staffAdmin, email: `adm_${ts}@test.com`, employeeId: `EMP_ADM_${ts}`, firstName: "Super", lastName: "Admin", role: "super_admin" },
    ]).run();

    // Insert staff-institution mappings
    await db.insert(staffInstitutions).values([
      { id: `map_alp_${ts}`, staffId: staffAlpha, institutionId: instAlpha },
      { id: `map_mul_1_${ts}`, staffId: staffMulti, institutionId: instAlpha },
      { id: `map_mul_2_${ts}`, staffId: staffMulti, institutionId: instBeta },
    ]).run();
  });

  afterAll(async () => {
    try {
      await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, [staffUnmapped, staffAlpha, staffMulti, staffAdmin])).run();
      await db.delete(staff).where(inArray(staff.id, [staffUnmapped, staffAlpha, staffMulti, staffAdmin])).run();
      await db.delete(institutions).where(inArray(institutions.id, [instAlpha, instBeta, instGamma])).run();
    } catch {
      // cleanup
    }
  });

  describe("resolveInstitutionScopeForSession", () => {
    it("should return null (fail closed) for non-admin staff with NO institution mapping", async () => {
      const session = { staffId: staffUnmapped, role: "staff", email: "unmapped@test.com", employeeId: "EMP_UNM", name: "Unmapped", tokenVersion: 1 };
      const scope = await resolveInstitutionScopeForSession(session);
      expect(scope).toBeNull();
      expect(scope).not.toBe("global");
    });

    it("should return 'global' for super_admin and admin users", async () => {
      const superAdminSession = { staffId: staffAdmin, role: "super_admin", email: "admin@test.com", employeeId: "EMP_ADM", name: "Admin", tokenVersion: 1 };
      const adminSession = { staffId: staffAdmin, role: "admin", email: "admin@test.com", employeeId: "EMP_ADM", name: "Admin", tokenVersion: 1 };
      
      expect(await resolveInstitutionScopeForSession(superAdminSession)).toBe("global");
      expect(await resolveInstitutionScopeForSession(adminSession)).toBe("global");
    });

    it("should resolve single institution mapping correctly", async () => {
      const session = { staffId: staffAlpha, role: "staff", email: "alpha@test.com", employeeId: "EMP_ALP", name: "Alpha", tokenVersion: 1 };
      const scope = await resolveInstitutionScopeForSession(session);
      expect(scope).toBe(instAlpha);
    });

    it("should resolve active institution matching subdomain if staff is a member", async () => {
      const session = { staffId: staffMulti, role: "staff", email: "multi@test.com", employeeId: "EMP_MUL", name: "Multi", tokenVersion: 1 };
      
      const scopeBeta = await resolveInstitutionScopeForSession(session, `beta_${ts}.thaibahive.com`);
      expect(scopeBeta).toBe(instBeta);

      const scopeAlpha = await resolveInstitutionScopeForSession(session, `alpha_${ts}.thaibahive.com`);
      expect(scopeAlpha).toBe(instAlpha);
    });

    it("should reject (return null) if staff accesses subdomain of institution they are NOT a member of", async () => {
      const session = { staffId: staffAlpha, role: "staff", email: "alpha@test.com", employeeId: "EMP_ALP", name: "Alpha", tokenVersion: 1 };
      
      // staffAlpha only belongs to instAlpha, not instGamma
      const scopeGamma = await resolveInstitutionScopeForSession(session, `gamma_${ts}.thaibahive.com`);
      expect(scopeGamma).toBeNull();
    });
  });

  describe("resolveScopedInstitutionId", () => {
    it("should throw TenantMismatchError if unmapped staff attempts to resolve scope", async () => {
      const session = {
        staffId: staffUnmapped,
        role: "staff",
        email: "unmapped@test.com",
        employeeId: "EMP_UNM",
        name: "Unmapped",
        tokenVersion: 1,
      };

      await expect(resolveScopedInstitutionId(instAlpha, session)).rejects.toThrow(TenantMismatchError);
      await expect(resolveScopedInstitutionId(null, session)).rejects.toThrow(TenantMismatchError);
    });

    it("should throw TenantMismatchError if staff of institution A requests institution B", async () => {
      const session = {
        staffId: staffAlpha,
        role: "staff",
        email: "alpha@test.com",
        employeeId: "EMP_ALP",
        name: "Alpha",
        tokenVersion: 1,
      };

      await expect(resolveScopedInstitutionId(instBeta, session)).rejects.toThrow(TenantMismatchError);
    });

    it("should return requested institution ID if staff is an active member", async () => {
      const session = {
        staffId: staffMulti,
        role: "staff",
        email: "multi@test.com",
        employeeId: "EMP_MUL",
        name: "Multi",
        tokenVersion: 1,
      };

      const resolvedBeta = await resolveScopedInstitutionId(instBeta, session);
      expect(resolvedBeta).toBe(instBeta);

      const resolvedAlpha = await resolveScopedInstitutionId(instAlpha, session);
      expect(resolvedAlpha).toBe(instAlpha);
    });

    it("should permit super_admin / admin to target any requested institution or default to global", async () => {
      const session = {
        staffId: staffAdmin,
        role: "super_admin",
        email: "admin@test.com",
        employeeId: "EMP_ADM",
        name: "Admin",
        tokenVersion: 1,
      };

      expect(await resolveScopedInstitutionId(instGamma, session)).toBe(instGamma);
      expect(await resolveScopedInstitutionId(null, session)).toBe("global");
    });
  });
});
