/**
 * @jest-environment node
 *
 * Academic Years Pipeline — Perfection & Hardening Test Suite
 *
 * Covers:
 * 1. Safe JSON parsing across all mutating endpoints (400 Bad Request)
 * 2. Strict date order validation (startDate < endDate)
 * 3. Duplicate name collision prevention (409 Conflict)
 * 4. Date overlap collision detection & diagnostics (409 Conflict)
 * 5. Multi-tenant boundary isolation
 * 6. Resource endpoints [id]: GET, PATCH, DELETE
 * 7. Referential integrity enforcement on deletion (409 on linked classes/students)
 */

import {
  db,
  institutions,
  staff,
  staffInstitutions,
  academicYears,
  classes,
  students,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import { GET as getAcademicYears, POST as createAcademicYear } from "@/app/api/academic/academic-years/route";
import {
  GET as getAcademicYearById,
  PATCH as patchAcademicYearById,
  DELETE as deleteAcademicYearById,
} from "@/app/api/academic/academic-years/[id]/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Academic Years Pipeline — Perfection & Hardening Suite", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_ay_a_${suffix}`;
  const instB = `inst_ay_b_${suffix}`;
  const adminAId = `stf_ay_adm_a_${suffix}`;
  const adminBId = `stf_ay_adm_b_${suffix}`;

  const sessionAdminA = {
    userId: adminAId,
    staffId: adminAId,
    email: `adm_a_${suffix}@thaiba.edu`,
    role: "admin",
    institutionId: instA,
    permissions: ["academic_years:manage"],
  };

  const sessionAdminB = {
    userId: adminBId,
    staffId: adminBId,
    email: `adm_b_${suffix}@thaiba.edu`,
    role: "admin",
    institutionId: instB,
    permissions: ["academic_years:manage"],
  };

  const createdYearIds: string[] = [];
  const createdClassIds: string[] = [];
  const createdStudentIds: string[] = [];

  beforeAll(async () => {
    // Seed Institutions
    await db.insert(institutions).values([
      { id: instA, name: "Academic Year Testing Academy A", code: `AYTA_${suffix}` },
      { id: instB, name: "Academic Year Testing Academy B", code: `AYTB_${suffix}` },
    ]).run();

    // Seed Admins
    await db.insert(staff).values([
      {
        id: adminAId,
        email: `adm_a_${suffix}@thaiba.edu`,
        employeeId: `EMP_AY_A_${suffix}`,
        firstName: "Academic",
        lastName: "Admin A",
        role: "admin",
        isActive: true,
      },
      {
        id: adminBId,
        email: `adm_b_${suffix}@thaiba.edu`,
        employeeId: `EMP_AY_B_${suffix}`,
        firstName: "Academic",
        lastName: "Admin B",
        role: "admin",
        isActive: true,
      },
    ]).run();

    // Link Staff to Institutions
    await db.insert(staffInstitutions).values([
      { id: `si_a_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_b_${suffix}`, staffId: adminBId, institutionId: instB },
    ]).run();
  });

  afterAll(async () => {
    if (createdStudentIds.length > 0) {
      await db.delete(students).where(inArray(students.id, createdStudentIds)).run();
    }
    if (createdClassIds.length > 0) {
      await db.delete(classes).where(inArray(classes.id, createdClassIds)).run();
    }
    if (createdYearIds.length > 0) {
      await db.delete(academicYears).where(inArray(academicYears.id, createdYearIds)).run();
    }
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.institutionId, [instA, instB])).run();
    await db.delete(staff).where(inArray(staff.id, [adminAId, adminBId])).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing Across Mutating Endpoints", () => {
    const malformedBody = '{"brokenJson": true, ';

    it("rejects malformed JSON on POST /api/academic/academic-years with 400", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: malformedBody,
      });

      const res = await createAcademicYear(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("rejects malformed JSON on PATCH /api/academic/academic-years/[id] with 400", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request("http://localhost/api/academic/academic-years/dummy_id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: malformedBody,
      });

      const res = await patchAcademicYearById(req as any, { params: Promise.resolve({ id: "dummy_id" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });
  });

  describe("2. Strict Date Order & Input Validation", () => {
    it("rejects academic year when startDate == endDate with 400 Bad Request", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Zero Day Year ${suffix}`,
          startDate: "2026-06-01",
          endDate: "2026-06-01",
          institutionId: instA,
        }),
      });

      const res = await createAcademicYear(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("strictly after startDate");
    });

    it("rejects academic year when startDate > endDate with 400 Bad Request", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Backwards Year ${suffix}`,
          startDate: "2027-06-01",
          endDate: "2026-06-01",
          institutionId: instA,
        }),
      });

      const res = await createAcademicYear(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("strictly after startDate");
    });

    it("rejects invalid date format with 400 Bad Request", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Invalid Date Year ${suffix}`,
          startDate: "01-06-2026",
          endDate: "2027-05-31",
          institutionId: instA,
        }),
      });

      const res = await createAcademicYear(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("YYYY-MM-DD");
    });
  });

  describe("3. Duplicate Name Collision Guards & Tenant Isolation", () => {
    let year1Id: string;

    it("creates an academic year successfully (201 Created)", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `2026-2027 Academic Year ${suffix}`,
          startDate: "2026-06-01",
          endDate: "2027-05-31",
          institutionId: instA,
        }),
      });

      const res = await createAcademicYear(req as any);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.academicYear.name).toBe(`2026-2027 Academic Year ${suffix}`);
      year1Id = data.academicYear.id;
      createdYearIds.push(year1Id);
    });

    it("blocks duplicate academic year name within same institution with 409 Conflict", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `2026-2027 Academic Year ${suffix}`,
          startDate: "2027-06-01",
          endDate: "2028-05-31",
          institutionId: instA,
        }),
      });

      const res = await createAcademicYear(req as any);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("already exists");
    });

    it("allows identical academic year name in a different institution (multi-tenant boundary)", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminB);

      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `2026-2027 Academic Year ${suffix}`,
          startDate: "2026-06-01",
          endDate: "2027-05-31",
          institutionId: instB,
        }),
      });

      const res = await createAcademicYear(req as any);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.academicYear.institutionId).toBe(instB);
      createdYearIds.push(data.academicYear.id);
    });
  });

  describe("4. Date Overlap Collision Detection", () => {
    // Current year in instA: 2026-06-01 to 2027-05-31

    it("blocks academic year whose dates are completely inside existing year (409 Conflict)", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Fall Semester Only ${suffix}`,
          startDate: "2026-09-01",
          endDate: "2026-12-31",
          institutionId: instA,
        }),
      });

      const res = await createAcademicYear(req as any);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("dates overlap with existing session");
      expect(data.error).toContain("2026-2027 Academic Year");
    });

    it("blocks academic year that overlaps the start boundary (409 Conflict)", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Early Start Year ${suffix}`,
          startDate: "2026-01-01",
          endDate: "2026-08-01",
          institutionId: instA,
        }),
      });

      const res = await createAcademicYear(req as any);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("dates overlap");
    });

    it("blocks academic year that overlaps the end boundary (409 Conflict)", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Late End Year ${suffix}`,
          startDate: "2027-04-01",
          endDate: "2028-03-31",
          institutionId: instA,
        }),
      });

      const res = await createAcademicYear(req as any);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("dates overlap");
    });

    it("allows a completely non-overlapping future academic year (201 Created)", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `2027-2028 Academic Year ${suffix}`,
          startDate: "2027-06-01",
          endDate: "2028-05-31",
          institutionId: instA,
        }),
      });

      const res = await createAcademicYear(req as any);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.academicYear.name).toBe(`2027-2028 Academic Year ${suffix}`);
      createdYearIds.push(data.academicYear.id);
    });
  });

  describe("5. Resource Endpoint Hardening: GET, PATCH, DELETE [id]", () => {
    let testYearId: string;

    beforeAll(async () => {
      // Create a test year for operations
      const newYear = await db.insert(academicYears).values({
        id: `ay_test_res_${suffix}`,
        name: `Resource Test Year ${suffix}`,
        startDate: "2029-06-01",
        endDate: "2030-05-31",
        isActive: true,
        institutionId: instA,
      }).returning().get();
      testYearId = newYear.id;
      createdYearIds.push(testYearId);
    });

    it("GET /api/academic/academic-years/[id] returns 200 with record", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request(`http://localhost/api/academic/academic-years/${testYearId}`);
      const res = await getAcademicYearById(req as any, { params: Promise.resolve({ id: testYearId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.academicYear.id).toBe(testYearId);
      expect(data.academicYear.name).toBe(`Resource Test Year ${suffix}`);
    });

    it("GET /api/academic/academic-years/[id] returns 404 for non-existent ID", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request("http://localhost/api/academic/academic-years/non_existent_id");
      const res = await getAcademicYearById(req as any, { params: Promise.resolve({ id: "non_existent_id" }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Academic year not found");
    });

    it("GET /api/academic/academic-years/[id] blocks cross-tenant access with 404", async () => {
      // User from instB trying to access instA's academic year
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminB);

      const req = new Request(`http://localhost/api/academic/academic-years/${testYearId}`);
      const res = await getAcademicYearById(req as any, { params: Promise.resolve({ id: testYearId }) });
      expect(res.status).toBe(404);
    });

    it("PATCH /api/academic/academic-years/[id] successfully updates name and active state", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request(`http://localhost/api/academic/academic-years/${testYearId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Renamed Resource Year ${suffix}`,
          isActive: false,
        }),
      });

      const res = await patchAcademicYearById(req as any, { params: Promise.resolve({ id: testYearId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.academicYear.name).toBe(`Renamed Resource Year ${suffix}`);
      expect(data.academicYear.isActive).toBe(false);
    });

    it("PATCH /api/academic/academic-years/[id] blocks update causing date overlap with 409", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      // Attempt to change dates to overlap with 2026-06-01 to 2027-05-31
      const req = new Request(`http://localhost/api/academic/academic-years/${testYearId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: "2026-10-01",
          endDate: "2027-04-01",
        }),
      });

      const res = await patchAcademicYearById(req as any, { params: Promise.resolve({ id: testYearId }) });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("Updated dates overlap");
    });

    it("PATCH /api/academic/academic-years/[id] blocks update with startDate >= endDate (400)", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request(`http://localhost/api/academic/academic-years/${testYearId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: "2030-05-31",
          endDate: "2029-06-01",
        }),
      });

      const res = await patchAcademicYearById(req as any, { params: Promise.resolve({ id: testYearId }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("strictly after startDate");
    });

    it("DELETE /api/academic/academic-years/[id] blocks deletion if linked to active classes (409)", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      // Create a class linked to testYearId
      const cls = await db.insert(classes).values({
        id: `cls_test_${suffix}`,
        name: `Class Linked Year ${suffix}`,
        institutionId: instA,
        academicYearId: testYearId,
        isActive: true,
      }).returning().get();
      createdClassIds.push(cls.id);

      const req = new Request(`http://localhost/api/academic/academic-years/${testYearId}`, {
        method: "DELETE",
      });

      const res = await deleteAcademicYearById(req as any, { params: Promise.resolve({ id: testYearId }) });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("active classes are assigned to this session");
    });

    it("DELETE /api/academic/academic-years/[id] blocks deletion if linked to enrolled students (409)", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      // Unlink the class first
      await db.delete(classes).where(eq(classes.id, `cls_test_${suffix}`)).run();
      createdClassIds.length = 0;

      // Link a student to testYearId
      const std = await db.insert(students).values({
        id: `std_test_${suffix}`,
        admissionNo: `ADM_${suffix}`,
        firstName: "Test",
        lastName: "Student",
        institutionId: instA,
        academicYearId: testYearId,
      }).returning().get();
      createdStudentIds.push(std.id);

      const req = new Request(`http://localhost/api/academic/academic-years/${testYearId}`, {
        method: "DELETE",
      });

      const res = await deleteAcademicYearById(req as any, { params: Promise.resolve({ id: testYearId }) });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("enrolled students are assigned to this session");
    });

    it("DELETE /api/academic/academic-years/[id] deletes cleanly when no dependencies exist (200)", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      // Unlink the student
      await db.delete(students).where(eq(students.id, `std_test_${suffix}`)).run();
      createdStudentIds.length = 0;

      const req = new Request(`http://localhost/api/academic/academic-years/${testYearId}`, {
        method: "DELETE",
      });

      const res = await deleteAcademicYearById(req as any, { params: Promise.resolve({ id: testYearId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify it no longer exists
      const verifyGet = await getAcademicYearById(req as any, { params: Promise.resolve({ id: testYearId }) });
      expect(verifyGet.status).toBe(404);
    });
  });
});
