/**
 * @jest-environment node
 *
 * Student Admissions & Enrollment Pipeline Perfection & Hardening Suite:
 * - Safe JSON parsing across all mutating endpoints (400 on malformed payloads)
 * - Schema bounds & email/phone constraints (400 on invalid formats or missing fields)
 * - Tenant-scoped duplicate admissionNo collision prevention (409 Conflict)
 * - Cross-institution admissionNo multi-tenancy isolation (same admissionNo permitted in different institutions)
 * - Intra-batch duplicate detection and diagnostic error reporting in bulk import
 * - Batch size clamping (max 500 rows)
 * - Soft deletion lifecycle & 404 responses for non-existent records
 */

import {
  db,
  institutions,
  staff,
  staffInstitutions,
  students,
  guardians,
  studentGuardians,
  classes,
  academicYears,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import { GET as getAcademicStudents, POST as postAcademicStudent } from "@/app/api/academic/students/route";
import { GET as getAcademicStudentById, PATCH as patchAcademicStudentById, DELETE as deleteAcademicStudentById } from "@/app/api/academic/students/[id]/route";
import { POST as postBulkImportStudents } from "@/app/api/academic/students/bulk-import/route";
import { GET as getStudents, POST as postStudent } from "@/app/api/students/route";
import { GET as getStudentById, PATCH as patchStudentById, DELETE as deleteStudentById } from "@/app/api/students/[id]/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Student Admissions & Enrollment Pipeline Perfection Suite", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_adm_perf_a_${suffix}`;
  const instB = `inst_adm_perf_b_${suffix}`;
  const adminAId = `stf_adm_coord_${suffix}`;
  const classAId = `cls_adm_${suffix}`;
  const academicYearAId = `ay_adm_${suffix}`;

  let createdStudentAId: string;

  beforeAll(async () => {
    // Seed Institutions
    await db.insert(institutions).values([
      { id: instA, name: "Alpha Admissions Academy", code: `AAA_${suffix}` },
      { id: instB, name: "Beta Admissions College", code: `BAC_${suffix}` },
    ]).run();

    // Seed Staff
    await db.insert(staff).values({
      id: adminAId,
      email: `adm_admin_${suffix}@thaiba.edu`,
      employeeId: `EMP_ADM_${suffix}`,
      firstName: "Admission",
      lastName: "Officer",
      role: "admin",
      isActive: true,
    }).run();

    await db.insert(staffInstitutions).values([
      { id: `si_adm_a_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_adm_b_${suffix}`, staffId: adminAId, institutionId: instB },
    ]).run();

    // Seed Academic Year & Class
    await db.insert(academicYears).values({
      id: academicYearAId,
      name: `AY-${suffix}`,
      startDate: "2026-06-01",
      endDate: "2027-05-31",
      institutionId: instA,
    }).run();

    await db.insert(classes).values({
      id: classAId,
      name: "Standard 1",
      section: "A",
      institutionId: instA,
      academicYearId: academicYearAId,
      isActive: true,
    }).run();
  });

  afterAll(async () => {
    await db.delete(studentGuardians).run();
    await db.delete(guardians).run();
    await db.delete(students).where(inArray(students.institutionId, [instA, instB])).run();
    await db.delete(classes).where(eq(classes.id, classAId)).run();
    await db.delete(academicYears).where(eq(academicYears.id, academicYearAId)).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, [adminAId])).run();
    await db.delete(staff).where(eq(staff.id, adminAId)).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  function mockSession(userId: string, targetInst: string) {
    (verifySession as jest.Mock).mockResolvedValue({
      userId,
      staffId: userId,
      role: "admin",
      institutionId: targetInst,
      institutionIds: [targetInst],
      permissions: ["*"],
    });
  }

  function makeMalformedRequest(method: string, url: string) {
    return new Request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: "MALFORMED_JSON_PAYLOAD",
    });
  }

  describe("1. Safe JSON Parsing Across All Mutating Endpoints", () => {
    beforeEach(() => mockSession(adminAId, instA));

    test("POST /api/academic/students returns 400 on malformed JSON payload", async () => {
      const req = makeMalformedRequest("POST", "http://localhost/api/academic/students");
      const res = await postAcademicStudent(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    test("PATCH /api/academic/students/[id] returns 400 on malformed JSON payload", async () => {
      const req = makeMalformedRequest("PATCH", "http://localhost/api/academic/students/fake_id");
      const res = await patchAcademicStudentById(req, { params: Promise.resolve({ id: "fake_id" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    test("POST /api/academic/students/bulk-import returns 400 on malformed JSON payload", async () => {
      const req = makeMalformedRequest("POST", "http://localhost/api/academic/students/bulk-import");
      const res = await postBulkImportStudents(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    test("POST /api/students returns 400 on malformed JSON payload", async () => {
      const req = makeMalformedRequest("POST", "http://localhost/api/students");
      const res = await postStudent(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    test("PATCH /api/students/[id] returns 400 on malformed JSON payload", async () => {
      const req = makeMalformedRequest("PATCH", "http://localhost/api/students/fake_id");
      const res = await patchStudentById(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });
  });

  describe("2. Schema Bounds & Input Validation", () => {
    beforeEach(() => mockSession(adminAId, instA));

    test("POST /api/academic/students rejects missing admissionNo", async () => {
      const req = new Request("http://localhost/api/academic/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "John",
          lastName: "Doe",
          institutionId: instA,
        }),
      });
      const res = await postAcademicStudent(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/admissionNo is required|expected string/i);
    });

    test("POST /api/academic/students rejects invalid email format", async () => {
      const req = new Request("http://localhost/api/academic/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNo: `ADM-${suffix}-001`,
          firstName: "John",
          lastName: "Doe",
          email: "not-an-email",
          institutionId: instA,
        }),
      });
      const res = await postAcademicStudent(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/invalid email/i);
    });

    test("POST /api/academic/students/bulk-import rejects empty rows array", async () => {
      const req = new Request("http://localhost/api/academic/students/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instA,
          rows: [],
        }),
      });
      const res = await postBulkImportStudents(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/at least one student row is required/i);
    });

    test("POST /api/academic/students/bulk-import rejects batch exceeding 500 rows", async () => {
      const oversizedRows = Array.from({ length: 501 }, (_, i) => ({
        admissionNo: `OVER_${i}`,
        firstName: "Test",
        lastName: "Student",
      }));
      const req = new Request("http://localhost/api/academic/students/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instA,
          rows: oversizedRows,
        }),
      });
      const res = await postBulkImportStudents(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Maximum batch size is 500 rows/i);
    });
  });

  describe("3. Admissions & Enrollment Creation & Tenant-Scoped Collisions", () => {
    beforeEach(() => mockSession(adminAId, instA));

    test("POST /api/academic/students successfully creates a student in Institution A", async () => {
      const req = new Request("http://localhost/api/academic/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNo: `ADM-${suffix}-101`,
          studentId: `ROLL-${suffix}-101`,
          firstName: "Aarav",
          lastName: "Sharma",
          email: `aarav_${suffix}@example.com`,
          phone: "9876543210",
          gender: "male",
          bloodGroup: "O+",
          classId: classAId,
          academicYearId: academicYearAId,
          institutionId: instA,
        }),
      });
      const res = await postAcademicStudent(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.student.id).toBeDefined();
      expect(data.student.admissionNo).toBe(`ADM-${suffix}-101`);
      createdStudentAId = data.student.id;
    });

    test("POST /api/academic/students detects duplicate admissionNo in Institution A (409 Conflict)", async () => {
      const req = new Request("http://localhost/api/academic/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNo: `adm-${suffix}-101`, // Case-insensitive duplicate check
          firstName: "Different",
          lastName: "Student",
          institutionId: instA,
        }),
      });
      const res = await postAcademicStudent(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/already exists in this institution/i);
    });

    test("POST /api/academic/students permits same admissionNo in Institution B (Multi-Tenant Isolation)", async () => {
      mockSession(adminAId, instB);
      const req = new Request("http://localhost/api/academic/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNo: `ADM-${suffix}-101`, // Same admissionNo, different institution!
          firstName: "Student",
          lastName: "InInstB",
          institutionId: instB,
        }),
      });
      const res = await postAcademicStudent(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.student.institutionId).toBe(instB);
    });

    test("POST /api/students detects duplicate admissionNo in Institution A (409 Conflict)", async () => {
      mockSession(adminAId, instA);
      const req = new Request("http://localhost/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNo: `ADM-${suffix}-101`,
          firstName: "Duplicate",
          lastName: "Attempt",
          institutionId: instA,
        }),
      });
      const res = await postStudent(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/already exists in this institution/i);
    });
  });

  describe("4. Student Update & Collision Protection", () => {
    let student2Id: string;
    beforeEach(() => mockSession(adminAId, instA));

    beforeAll(async () => {
      const req = new Request("http://localhost/api/academic/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNo: `ADM-${suffix}-102`,
          firstName: "Diya",
          lastName: "Patel",
          institutionId: instA,
        }),
      });
      const res = await postAcademicStudent(req);
      const data = await res.json();
      student2Id = data.student.id;
    });

    test("PATCH /api/academic/students/[id] rejects renaming to existing student admissionNo with 409", async () => {
      const req = new Request(`http://localhost/api/academic/students/${student2Id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNo: `ADM-${suffix}-101`, // Collides with student 1
        }),
      });
      const res = await patchAcademicStudentById(req, { params: Promise.resolve({ id: student2Id }) });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/already exists in this institution/i);
    });

    test("PATCH /api/academic/students/[id] successfully updates non-colliding fields", async () => {
      const req = new Request(`http://localhost/api/academic/students/${student2Id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emergencyContactName: "Father",
          emergencyContactPhone: "9123456789",
          bloodGroup: "B+",
        }),
      });
      const res = await patchAcademicStudentById(req, { params: Promise.resolve({ id: student2Id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.student.emergencyContactName).toBe("Father");
      expect(data.student.bloodGroup).toBe("B+");
    });

    test("GET /api/academic/students/[id] returns 404 for non-existent student", async () => {
      const req = new Request("http://localhost/api/academic/students/non_existent_id");
      const res = await getAcademicStudentById(req, { params: Promise.resolve({ id: "non_existent_id" }) });
      expect(res.status).toBe(404);
    });

    test("PATCH /api/academic/students/[id] returns 404 for non-existent student", async () => {
      const req = new Request("http://localhost/api/academic/students/non_existent_id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: "Ghost" }),
      });
      const res = await patchAcademicStudentById(req, { params: Promise.resolve({ id: "non_existent_id" }) });
      expect(res.status).toBe(404);
    });
  });

  describe("5. Bulk Import: Intra-Batch Deduplication & Guardian Integration", () => {
    beforeEach(() => mockSession(adminAId, instA));

    test("POST /api/academic/students/bulk-import handles valid rows, DB duplicates, and intra-batch duplicates", async () => {
      const req = new Request("http://localhost/api/academic/students/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instA,
          rows: [
            // Row 1: Valid new student with guardian
            {
              admissionNo: `ADM-${suffix}-201`,
              firstName: "Rohan",
              lastName: "Verma",
              gender: "male",
              guardianName: "Rajesh Verma",
              guardianPhone: "9876500001",
              guardianRelation: "Father",
            },
            // Row 2: DB Duplicate of existing student ADM-xxx-101
            {
              admissionNo: `ADM-${suffix}-101`,
              firstName: "Duplicate",
              lastName: "Existing",
            },
            // Row 3: Intra-batch duplicate of Row 1
            {
              admissionNo: `adm-${suffix}-201`, // Case-insensitive duplicate of Row 1!
              firstName: "Rohan",
              lastName: "Duplicate",
            },
            // Row 4: Another valid student
            {
              admissionNo: `ADM-${suffix}-202`,
              firstName: "Sneha",
              lastName: "Nair",
              gender: "female",
            },
          ],
        }),
      });

      const res = await postBulkImportStudents(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.totalRows).toBe(4);
      expect(data.successCount).toBe(2);
      expect(data.failureCount).toBe(2);

      // Verify row 2 error: DB Duplicate
      const row2Err = data.errors.find((e: any) => e.row === 2);
      expect(row2Err?.error).toMatch(/already exists in this institution/i);

      // Verify row 3 error: Intra-batch duplicate
      const row3Err = data.errors.find((e: any) => e.row === 3);
      expect(row3Err?.error).toMatch(/is duplicated within this import batch/i);

      // Verify guardian was created for Row 1
      const student1 = await db
        .select()
        .from(students)
        .where(eq(students.admissionNo, `ADM-${suffix}-201`))
        .get();
      expect(student1).toBeDefined();

      const sgRecord = await db
        .select()
        .from(studentGuardians)
        .where(eq(studentGuardians.studentId, student1!.id))
        .get();
      expect(sgRecord).toBeDefined();
      expect(sgRecord?.relationship).toBe("Father");
    });
  });

  describe("6. Soft Deletion & Top-Level Endpoints Lifecycle", () => {
    let studentToSoftDeleteId: string;
    beforeEach(() => mockSession(adminAId, instA));

    beforeAll(async () => {
      const student = await db
        .select()
        .from(students)
        .where(eq(students.admissionNo, `ADM-${suffix}-202`))
        .get();
      studentToSoftDeleteId = student!.id;
    });

    test("DELETE /api/academic/students/[id] soft deletes student (isActive = false)", async () => {
      const req = new Request(`http://localhost/api/academic/students/${studentToSoftDeleteId}`, {
        method: "DELETE",
      });
      const res = await deleteAcademicStudentById(req, { params: Promise.resolve({ id: studentToSoftDeleteId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const check = await db.select().from(students).where(eq(students.id, studentToSoftDeleteId)).get();
      expect(check?.isActive).toBe(false);
    });

    test("DELETE /api/academic/students/[id] returns 404 for non-existent student", async () => {
      const req = new Request("http://localhost/api/academic/students/fake_student_del", {
        method: "DELETE",
      });
      const res = await deleteAcademicStudentById(req, { params: Promise.resolve({ id: "fake_student_del" }) });
      expect(res.status).toBe(404);
    });

    test("GET /api/students returns paginated list of students", async () => {
      const req = new Request(`http://localhost/api/students?institutionId=${instA}&limit=10&offset=0`);
      const res = await getStudents(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.students)).toBe(true);
      expect(data.limit).toBe(10);
    });

    test("DELETE /api/students/[id] returns 404 for non-existent student", async () => {
      const req = new Request("http://localhost/api/students/fake_student_std_del", {
        method: "DELETE",
      });
      const res = await deleteStudentById(req);
      expect(res.status).toBe(404);
    });
  });
});
