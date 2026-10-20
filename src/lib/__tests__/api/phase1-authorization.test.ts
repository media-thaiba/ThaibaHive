import { canAccessTask } from "@/lib/auth/department-scope";
import { db } from "@/db";
import { staff, institutions, staffInstitutions } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("Phase 1 Security & Authorization Regressions", () => {
  const callerPrincipalId = "test_principal_sec_01";
  const callerInstitutionId = "test_inst_sec_01";
  const otherInstitutionId = "test_inst_sec_02";
  const staffInstId = "test_si_link_01";

  beforeAll(async () => {
    // Seed institutions
    await db.insert(institutions).values([
      { id: callerInstitutionId, name: "Alpha Academy", code: "ALPHA" },
      { id: otherInstitutionId, name: "Beta Institute", code: "BETA" },
    ]).onConflictDoNothing();

    // Seed principal staff
    await db.insert(staff).values({
      id: callerPrincipalId,
      email: "principal_sec@alpha.edu",
      role: "principal",
      firstName: "Principal",
      lastName: "Tester",
      employeeId: "EMP-PRIN-01",
      tokenVersion: 0,
      isActive: true,
    }).onConflictDoNothing();

    // Link principal to caller institution
    await db.insert(staffInstitutions).values({
      id: staffInstId,
      staffId: callerPrincipalId,
      institutionId: callerInstitutionId,
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(staffInstitutions).where(eq(staffInstitutions.id, staffInstId));
    await db.delete(staff).where(eq(staff.id, callerPrincipalId));
    await db.delete(institutions).where(eq(institutions.id, callerInstitutionId));
    await db.delete(institutions).where(eq(institutions.id, otherInstitutionId));
  });

  describe("TH-006: Principal Task Scoping", () => {
    it("allows principal to access institution-wide task within their institution even when departmentId is null", async () => {
      const task = {
        id: "task_inst_01",
        institutionId: callerInstitutionId,
        departmentId: null,
        assignedToId: "other_staff_01",
        assignedById: "other_staff_02",
      };

      const hasAccess = await canAccessTask(callerPrincipalId, "principal", task);
      expect(hasAccess).toBe(true);
    });

    it("denies principal access to institution-wide task from another institution", async () => {
      const task = {
        id: "task_inst_02",
        institutionId: otherInstitutionId,
        departmentId: null,
        assignedToId: "other_staff_01",
        assignedById: "other_staff_02",
      };

      const hasAccess = await canAccessTask(callerPrincipalId, "principal", task);
      expect(hasAccess).toBe(false);
    });

    it("allows principal to access tasks where they are assignedTo or assignedBy regardless of institution", async () => {
      const assignedToTask = {
        id: "task_assigned_01",
        institutionId: otherInstitutionId,
        departmentId: null,
        assignedToId: callerPrincipalId,
        assignedById: "other_staff_02",
      };

      const assignedByTask = {
        id: "task_assigned_02",
        institutionId: otherInstitutionId,
        departmentId: null,
        assignedToId: "other_staff_01",
        assignedById: callerPrincipalId,
      };

      expect(await canAccessTask(callerPrincipalId, "principal", assignedToTask)).toBe(true);
      expect(await canAccessTask(callerPrincipalId, "principal", assignedByTask)).toBe(true);
    });
  });
});
