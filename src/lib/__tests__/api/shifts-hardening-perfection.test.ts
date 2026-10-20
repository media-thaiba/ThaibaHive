/**
 * @jest-environment node
 *
 * Shift Scheduling & Staff Roster Pipeline Perfection & Hardening Suite:
 * - Safe JSON parsing across all mutating endpoints (400 on malformed payloads)
 * - 24-hour time regex and date format validation with overnight shift support
 * - 404 existence guards on shifts, departments, staff, and assignments
 * - 409 conflict guards on duplicate effective date assignments & active shift deletion
 * - Multi-tenant isolation for department binding and staff assignment
 */
import {
  db,
  institutions,
  departments,
  staff,
  staffInstitutions,
  shifts,
  staffShifts,
  notifications,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listShifts,
  POST as createShift,
} from "@/app/api/admin/shifts/route";
import {
  GET as getShift,
  PUT as updateShift,
  DELETE as deleteShift,
} from "@/app/api/admin/shifts/[id]/route";
import {
  GET as listStaffShifts,
  POST as createStaffShift,
  DELETE as deleteStaffShift,
} from "@/app/api/admin/staff-shifts/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Shift Scheduling & Staff Roster Perfection Suite", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_shf_a_${suffix}`;
  const instB = `inst_shf_b_${suffix}`;
  const deptA = `dept_shf_a_${suffix}`;
  const deptB = `dept_shf_b_${suffix}`;

  const adminAId = `stf_shf_adm_a_${suffix}`;
  const adminBId = `stf_shf_adm_b_${suffix}`;
  const staffAId = `stf_shf_sa_${suffix}`;
  const staffBId = `stf_shf_sb_${suffix}`;

  const asUser = (role: string, staffId: string, instId: string) => {
    (verifySession as jest.Mock).mockResolvedValue({
      userId: staffId,
      staffId,
      email: `${staffId}@test.local`,
      role,
      institutionId: instId,
    });
  };

  const contextParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: instA, name: `Shift Inst A ${suffix}`, code: `SIA_${suffix}`, isActive: true },
      { id: instB, name: `Shift Inst B ${suffix}`, code: `SIB_${suffix}`, isActive: true },
    ]);

    await db.insert(departments).values([
      { id: deptA, institutionId: instA, name: `Dept A ${suffix}`, code: `DA_${suffix}` },
      { id: deptB, institutionId: instB, name: `Dept B ${suffix}`, code: `DB_${suffix}` },
    ]);

    await db.insert(staff).values([
      {
        id: adminAId,
        email: `admin_a_${suffix}@test.local`,
        employeeId: `EMP_SA_A_${suffix}`,
        firstName: "Admin",
        lastName: "Alpha",
        role: "admin",
      },
      {
        id: adminBId,
        email: `admin_b_${suffix}@test.local`,
        employeeId: `EMP_SA_B_${suffix}`,
        firstName: "Admin",
        lastName: "Beta",
        role: "admin",
      },
      {
        id: staffAId,
        email: `staff_a_${suffix}@test.local`,
        employeeId: `EMP_ST_A_${suffix}`,
        firstName: "Staff",
        lastName: "Alpha",
        role: "staff",
      },
      {
        id: staffBId,
        email: `staff_b_${suffix}@test.local`,
        employeeId: `EMP_ST_B_${suffix}`,
        firstName: "Staff",
        lastName: "Beta",
        role: "staff",
      },
    ]);

    await db.insert(staffInstitutions).values([
      { id: `si_shf_adm_a_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_shf_adm_b_${suffix}`, staffId: adminBId, institutionId: instB },
      { id: `si_shf_sa_${suffix}`, staffId: staffAId, institutionId: instA },
      { id: `si_shf_sb_${suffix}`, staffId: staffBId, institutionId: instB },
    ]);
  });

  afterAll(async () => {
    try {
      await db.delete(notifications).where(inArray(notifications.staffId, [adminAId, adminBId, staffAId, staffBId])).run();
    } catch {
      // ignore
    }
    await db.delete(staffShifts).where(inArray(staffShifts.staffId, [staffAId, staffBId])).run();
    await db.delete(shifts).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.institutionId, [instA, instB])).run();
    await db.delete(departments).where(inArray(departments.id, [deptA, deptB])).run();
    await db.delete(staff).where(inArray(staff.id, [adminAId, adminBId, staffAId, staffBId])).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing Across All Mutating Endpoints", () => {
    it("POST /api/admin/shifts returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{bad:json",
      });
      const res = await createShift(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("PUT /api/admin/shifts/[id] returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/shifts/any-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "{malformed_payload",
      });
      const res = await updateShift(req, contextParams("any-id"));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("POST /api/admin/staff-shifts returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/staff-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      });
      const res = await createStaffShift(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });
  });

  describe("2. Schema Bounds & Time/Date Validations", () => {
    it("rejects invalid 24-hour time format (e.g. 25:00)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Morning Shift",
          startTime: "25:00",
          endTime: "17:00",
        }),
      });
      const res = await createShift(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/valid 24-hour time/i);
    });

    it("rejects negative gracePeriodMinutes", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Morning Shift",
          startTime: "09:00",
          endTime: "17:00",
          gracePeriodMinutes: -5,
        }),
      });
      const res = await createShift(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/cannot be negative/i);
    });

    it("accepts valid overnight shift (e.g. 22:00 to 06:00)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Night Security Patrol",
          startTime: "22:00",
          endTime: "06:00",
          gracePeriodMinutes: 10,
        }),
      });
      const res = await createShift(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.shift.startTime).toBe("22:00");
      expect(data.shift.endTime).toBe("06:00");
    });

    it("rejects invalid staffShift date format", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/staff-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffAId,
          shiftId: "some-shift",
          effectiveFrom: "not-a-date",
        }),
      });
      const res = await createStaffShift(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/must be YYYY-MM-DD/i);
    });

    it("rejects inverted date range where effectiveTo < effectiveFrom", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/staff-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffAId,
          shiftId: "some-shift",
          effectiveFrom: "2026-10-25",
          effectiveTo: "2026-10-20",
        }),
      });
      const res = await createStaffShift(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/effectiveTo must be on or after effectiveFrom/i);
    });
  });

  describe("3. 404 Existence Guards", () => {
    it("GET /api/admin/shifts/[id] returns 404 for non-existent shift", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/shifts/non-existent-id");
      const res = await getShift(req, contextParams("non-existent-id"));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Shift not found");
    });

    it("PUT /api/admin/shifts/[id] returns 404 for non-existent shift", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/shifts/non-existent-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Shift" }),
      });
      const res = await updateShift(req, contextParams("non-existent-id"));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Shift not found");
    });

    it("DELETE /api/admin/shifts/[id] returns 404 for non-existent shift", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/shifts/non-existent-id", { method: "DELETE" });
      const res = await deleteShift(req, contextParams("non-existent-id"));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Shift not found");
    });

    it("POST /api/admin/shifts returns 404 when departmentId does not exist", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Invalid Dept Shift",
          startTime: "08:00",
          endTime: "16:00",
          departmentId: "non-existent-dept-id",
        }),
      });
      const res = await createShift(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Department not found");
    });

    it("POST /api/admin/staff-shifts returns 404 when shiftId does not exist", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/staff-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffAId,
          shiftId: "non-existent-shift-id",
          effectiveFrom: "2026-11-01",
        }),
      });
      const res = await createStaffShift(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Shift not found");
    });

    it("POST /api/admin/staff-shifts returns 404 when staffId does not exist", async () => {
      // First create a valid shift
      asUser("admin", adminAId, instA);
      const createRes = await createShift(new Request("http://localhost/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Standard Day Shift",
          startTime: "09:00",
          endTime: "17:00",
        }),
      }));
      const { shift } = await createRes.json();

      const req = new Request("http://localhost/api/admin/staff-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: "non-existent-staff-id",
          shiftId: shift.id,
          effectiveFrom: "2026-11-01",
        }),
      });
      const res = await createStaffShift(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Staff member not found");
    });
  });

  describe("4. Multi-Tenant Scoping & Conflict Guards", () => {
    let validShiftId: string;

    beforeAll(async () => {
      asUser("admin", adminAId, instA);
      const res = await createShift(new Request("http://localhost/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Campus Shift A",
          startTime: "08:30",
          endTime: "16:30",
          departmentId: deptA,
        }),
      }));
      const data = await res.json();
      validShiftId = data.shift.id;
    });

    it("blocks Admin A from binding shift to Department B of Institution B (Cross-Tenant Guard)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Foreign Dept Shift",
          startTime: "09:00",
          endTime: "17:00",
          departmentId: deptB,
        }),
      });
      const res = await createShift(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/does not belong to your institution/i);
    });

    it("blocks Admin A from assigning shift to Staff B of Institution B (Staff Isolation Guard)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/staff-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffBId,
          shiftId: validShiftId,
          effectiveFrom: "2026-11-01",
        }),
      });
      const res = await createStaffShift(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Staff does not belong to your institution/i);
    });

    it("successfully assigns Staff A to Shift A", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/staff-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffAId,
          shiftId: validShiftId,
          effectiveFrom: "2026-11-01",
        }),
      });
      const res = await createStaffShift(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.assignment.staffId).toBe(staffAId);
    });

    it("returns 409 Conflict when assigning same staff on same effective date", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/admin/staff-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffAId,
          shiftId: validShiftId,
          effectiveFrom: "2026-11-01",
        }),
      });
      const res = await createStaffShift(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/already has a shift assignment for this effective date/i);
    });

    it("returns 409 Conflict when attempting to delete a shift with active staff assignments", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/admin/shifts/${validShiftId}`, { method: "DELETE" });
      const res = await deleteShift(req, contextParams(validShiftId));
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/Cannot delete shift with active staff assignments/i);
    });
  });

  describe("5. End-to-End Assignment Lifecycle & Cleanup", () => {
    it("lists staff shifts scoped to institution", async () => {
      asUser("admin", adminAId, instA);
      const res = await listStaffShifts(new Request("http://localhost/api/admin/staff-shifts"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.assignments)).toBe(true);
      expect(data.assignments.some((a: any) => a.staffId === staffAId)).toBe(true);
    });

    it("deletes assignment, then successfully deletes shift", async () => {
      asUser("admin", adminAId, instA);
      // Find assignment
      const listRes = await listStaffShifts(new Request("http://localhost/api/admin/staff-shifts"));
      const { assignments } = await listRes.json();
      const assignment = assignments.find((a: any) => a.staffId === staffAId);
      expect(assignment).toBeTruthy();

      // Delete assignment
      const delAssignRes = await deleteStaffShift(new Request(`http://localhost/api/admin/staff-shifts?id=${assignment.id}`, { method: "DELETE" }));
      expect(delAssignRes.status).toBe(200);

      // Now deleting the shift succeeds
      const delShiftRes = await deleteShift(new Request(`http://localhost/api/admin/shifts/${assignment.shiftId}`, { method: "DELETE" }), contextParams(assignment.shiftId));
      expect(delShiftRes.status).toBe(200);

      // Verify shift is deleted
      const checkRes = await getShift(new Request(`http://localhost/api/admin/shifts/${assignment.shiftId}`), contextParams(assignment.shiftId));
      expect(checkRes.status).toBe(404);
    });
  });
});
