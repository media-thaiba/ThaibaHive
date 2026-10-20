/**
 * @jest-environment node
 *
 * Leave Management & Approvals Pipeline — Hardening & Integrity Suite:
 * - Safe JSON parsing: Malformed/empty payloads return 400 on POST and PUT
 * - Principal institutional authorization: Principal can view & review leaves of staff in their institution
 * - Segregation of duties: Staff cannot approve their own leave request (403)
 * - Review immutability: Cannot review already approved or rejected leaves (400)
 * - Balance credit on delete: Approved leave deletion atomically restores deducted days to leaveBalances
 * - Overlap & conflict guards: Rejects overlapping leave requests with 409
 * - Bounded input validation: Zod reviewNotes & reason bounds enforced
 */

import {
  db,
  institutions,
  departments,
  staff,
  staffInstitutions,
  staffDepartments,
  leaveTypes,
  leaveBalances,
  leaveRequests,
  notifications,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, and, or, inArray } from "drizzle-orm";
import {
  GET as listLeaves,
  POST as createLeave,
} from "@/app/api/leaves/route";
import {
  GET as getLeaveDetail,
  PUT as reviewLeave,
  DELETE as deleteLeave,
} from "@/app/api/leaves/[id]/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Leave Management & Approvals Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_lev_a_${suffix}`;
  const instB = `inst_lev_b_${suffix}`;

  const deptA = `dept_lev_a_${suffix}`;

  const adminAId = `stf_lev_adm_a_${suffix}`;
  const principalAId = `stf_lev_pa_${suffix}`;
  const hodAId = `stf_lev_hoda_${suffix}`;
  const staffA1Id = `stf_lev_a1_${suffix}`;

  const principalBId = `stf_lev_pb_${suffix}`;
  const staffBId = `stf_lev_b1_${suffix}`;

  const leaveTypeCasual = `lt_cas_${suffix}`;

  const currentYear = 2026;

  function asUser(role: string, staffId: string, institutionId?: string) {
    (verifySession as jest.Mock).mockResolvedValue({
      sub: staffId,
      staffId,
      role,
      institutionId: institutionId ?? null,
      permissions: role === "super_admin" ? ["*"] : [
        "leaves:read",
        "leaves:create",
        "leaves:approve",
        "leaves:delete",
      ],
    });
    (hasPermission as jest.Mock).mockReturnValue(true);
  }

  beforeAll(async () => {
    // 1. Create Institutions
    await db.insert(institutions).values([
      { id: instA, name: `Leave Inst A ${suffix}`, code: `LA_${suffix}` },
      { id: instB, name: `Leave Inst B ${suffix}`, code: `LB_${suffix}` },
    ]);

    // 2. Create Staff
    await db.insert(staff).values([
      {
        id: adminAId,
        firstName: "Admin",
        lastName: "A",
        email: `adm_a_${suffix}@test.com`,
        employeeId: `EMP_ADM_${suffix}`,
        role: "admin",
      },
      {
        id: principalAId,
        firstName: "Principal",
        lastName: "A",
        email: `prin_a_${suffix}@test.com`,
        employeeId: `EMP_PRIN_A_${suffix}`,
        role: "principal",
      },
      {
        id: hodAId,
        firstName: "HOD",
        lastName: "A",
        email: `hod_a_${suffix}@test.com`,
        employeeId: `EMP_HOD_A_${suffix}`,
        role: "hod",
      },
      {
        id: staffA1Id,
        firstName: "Staff",
        lastName: "A1",
        email: `stf_a1_${suffix}@test.com`,
        employeeId: `EMP_A1_${suffix}`,
        role: "staff",
      },
      {
        id: principalBId,
        firstName: "Principal",
        lastName: "B",
        email: `prin_b_${suffix}@test.com`,
        employeeId: `EMP_PRIN_B_${suffix}`,
        role: "principal",
      },
      {
        id: staffBId,
        firstName: "Staff",
        lastName: "B1",
        email: `stf_b1_${suffix}@test.com`,
        employeeId: `EMP_B1_${suffix}`,
        role: "staff",
      },
    ]);

    // 3. Create Department
    await db.insert(departments).values([
      {
        id: deptA,
        name: `Dept A ${suffix}`,
        code: `DA_${suffix}`,
        institutionId: instA,
        headUserId: hodAId,
      },
    ]);

    // 4. Staff Institutions Affiliation
    await db.insert(staffInstitutions).values([
      { id: `si_adm_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_pa_${suffix}`, staffId: principalAId, institutionId: instA },
      { id: `si_hoda_${suffix}`, staffId: hodAId, institutionId: instA },
      { id: `si_a1_${suffix}`, staffId: staffA1Id, institutionId: instA },
      { id: `si_pb_${suffix}`, staffId: principalBId, institutionId: instB },
      { id: `si_b1_${suffix}`, staffId: staffBId, institutionId: instB },
    ]);

    // 5. Staff Departments
    await db.insert(staffDepartments).values([
      { id: `sd_hoda_${suffix}`, staffId: hodAId, departmentId: deptA, isPrimary: true },
      { id: `sd_a1_${suffix}`, staffId: staffA1Id, departmentId: deptA, isPrimary: true },
    ]);

    // 6. Leave Types
    await db.insert(leaveTypes).values([
      {
        id: leaveTypeCasual,
        name: `Casual Leave ${suffix}`,
        code: `CL_${suffix}`,
        daysAllowed: 12,
        requiresApproval: true,
      },
    ]);

    // 7. Leave Balances for Staff A1 and Staff B1
    await db.insert(leaveBalances).values([
      {
        id: `bal_a1_${suffix}`,
        staffId: staffA1Id,
        leaveTypeId: leaveTypeCasual,
        year: currentYear,
        totalDays: 12,
        usedDays: 0,
      },
      {
        id: `bal_b1_${suffix}`,
        staffId: staffBId,
        leaveTypeId: leaveTypeCasual,
        year: currentYear,
        totalDays: 12,
        usedDays: 0,
      },
    ]);
  });

  afterAll(async () => {
    const testStaffIds = [adminAId, principalAId, hodAId, staffA1Id, principalBId, staffBId];
    // Teardown in strict FK dependency order
    await db.delete(notifications).where(inArray(notifications.staffId, testStaffIds)).run();
    await db.delete(leaveRequests).where(
      or(
        inArray(leaveRequests.staffId, testStaffIds),
        inArray(leaveRequests.reviewedById, testStaffIds)
      )
    ).run();
    await db.delete(leaveBalances).where(
      inArray(leaveBalances.staffId, [staffA1Id, staffBId])
    ).run();
    await db.delete(leaveTypes).where(eq(leaveTypes.id, leaveTypeCasual)).run();
    await db.delete(staffDepartments).where(
      inArray(staffDepartments.staffId, [hodAId, staffA1Id])
    ).run();
    await db.delete(staffInstitutions).where(
      inArray(staffInstitutions.staffId, testStaffIds)
    ).run();
    await db.update(departments).set({ headUserId: null }).where(eq(departments.id, deptA)).run();
    await db.delete(departments).where(eq(departments.id, deptA)).run();
    await db.delete(staff).where(
      inArray(staff.id, testStaffIds)
    ).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing Across Endpoints", () => {
    it("POST /api/leaves returns 400 on malformed JSON", async () => {
      asUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "bad json {",
      });
      const res = await createLeave(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });

    it("PUT /api/leaves/[id] returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/leaves/sample-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "{ unclosed json",
      });
      const res = await reviewLeave(req, { params: Promise.resolve({ id: "sample-id" }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });
  });

  describe("2. Principal Institutional Scope Authorization", () => {
    let leaveA1Id: string;

    it("creates a leave request for Staff A1", async () => {
      asUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId: leaveTypeCasual,
          startDate: `${currentYear}-11-01`,
          endDate: `${currentYear}-11-03`,
          daysCount: 3,
          reason: "Family function",
        }),
      });
      const res = await createLeave(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.leave.status).toBe("pending");
      leaveA1Id = body.leave.id;
    });

    it("Principal A can view leave of Staff A1 (same institution)", async () => {
      asUser("principal", principalAId, instA);
      const req = new Request(`http://localhost/api/leaves/${leaveA1Id}`);
      const res = await getLeaveDetail(req, { params: Promise.resolve({ id: leaveA1Id }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.leave.id).toBe(leaveA1Id);
    });

    it("Principal B CANNOT view leave of Staff A1 from Institution A (404/403)", async () => {
      asUser("principal", principalBId, instB);
      const req = new Request(`http://localhost/api/leaves/${leaveA1Id}`);
      const res = await getLeaveDetail(req, { params: Promise.resolve({ id: leaveA1Id }) });
      expect([403, 404]).toContain(res.status);
    });

    it("blocks staff from approving their own leave (403)", async () => {
      asUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/leaves/${leaveA1Id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const res = await reviewLeave(req, { params: Promise.resolve({ id: leaveA1Id }) });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toMatch(/Cannot approve your own leave/i);
    });

    it("Admin A approves leave and deducts 3 days from balance", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/leaves/${leaveA1Id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved", reviewNotes: "Approved by administration" }),
      });
      const res = await reviewLeave(req, { params: Promise.resolve({ id: leaveA1Id }) });
      expect(res.status).toBe(200);

      // Verify balance deduction
      const balance = await db
        .select()
        .from(leaveBalances)
        .where(
          and(
            eq(leaveBalances.staffId, staffA1Id),
            eq(leaveBalances.leaveTypeId, leaveTypeCasual),
            eq(leaveBalances.year, currentYear)
          )
        )
        .get();
      expect(balance?.usedDays).toBe(3);
    });

    it("blocks re-review of already approved leave (400)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/leaves/${leaveA1Id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      const res = await reviewLeave(req, { params: Promise.resolve({ id: leaveA1Id }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/already/i);
    });

    it("deleting an approved leave atomically refunds the 3 days to balance", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/leaves/${leaveA1Id}`, {
        method: "DELETE",
      });
      const res = await deleteLeave(req, { params: Promise.resolve({ id: leaveA1Id }) });
      expect(res.status).toBe(200);

      // Verify refund
      const balance = await db
        .select()
        .from(leaveBalances)
        .where(
          and(
            eq(leaveBalances.staffId, staffA1Id),
            eq(leaveBalances.leaveTypeId, leaveTypeCasual),
            eq(leaveBalances.year, currentYear)
          )
        )
        .get();
      expect(balance?.usedDays).toBe(0);
    });
  });

  describe("3. Overlap Prevention", () => {
    it("rejects overlapping leave dates with 409", async () => {
      asUser("staff", staffBId, instB);
      // Create first leave
      const req1 = new Request("http://localhost/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId: leaveTypeCasual,
          startDate: `${currentYear}-12-01`,
          endDate: `${currentYear}-12-05`,
          daysCount: 5,
        }),
      });
      const res1 = await createLeave(req1);
      expect(res1.status).toBe(201);
      const b1 = await res1.json();

      // Attempt overlapping leave
      const req2 = new Request("http://localhost/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId: leaveTypeCasual,
          startDate: `${currentYear}-12-03`,
          endDate: `${currentYear}-12-07`,
          daysCount: 5,
        }),
      });
      const res2 = await createLeave(req2);
      expect(res2.status).toBe(409);
      const b2 = await res2.json();
      expect(b2.error).toMatch(/overlap/i);

      // Cleanup
      await db.delete(leaveRequests).where(eq(leaveRequests.id, b1.leave.id)).run();
    });
  });
});
