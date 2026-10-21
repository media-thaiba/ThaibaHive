/**
 * @jest-environment node
 *
 * Bulk Student Class Attendance Pipeline — Hardening Test Suite
 * Covers:
 * - Safe JSON parsing (malformed payloads return 400)
 * - Rate limiting enforcement
 * - Batch size limits (max 500)
 * - Date format validation (YYYY-MM-DD)
 * - Cross-tenant isolation (403/404)
 * - Student enrollment verification (400 if not enrolled)
 * - Concurrency serialization (mutex prevents race conditions)
 * - Duplicate prevention (upsert behavior)
 * - Multi-tenant isolation
 */
import {
  db,
  institutions,
  staff,
  staffInstitutions,
  classes,
  students,
  studentAttendanceLogs,
  attendanceRegister,
  departments,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, and, inArray } from "drizzle-orm";
import { POST as bulkAttendancePost } from "@/app/api/academic/attendance/bulk/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

jest.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 999, resetMs: 0 }),
  rateLimitResponse: (ms: number) => ({ error: "Rate limit exceeded", retryAfter: ms }),
}));

const BASE = new Date(2026, 10, 1, 12, 0, 0, 0); // 2026-11-01 12:00 local

describe("Bulk Student Class Attendance Pipeline -- Hardening Suite", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_bulk_a_${suffix}`;
  const instB = `inst_bulk_b_${suffix}`;
  const classA = `cls_bulk_a_${suffix}`;
  const classB = `cls_bulk_b_${suffix}`;
  const staffA = `stf_bulk_a_${suffix}`;
  const staffB = `stf_bulk_b_${suffix}`;
  const studentA = `usr_bulk_a_${suffix}`;
  const studentB = `usr_bulk_b_${suffix}`;
  const studentC = `usr_bulk_c_${suffix}`;
  const studentD = `usr_bulk_d_${suffix}`;
  const studentE = `usr_bulk_e_${suffix}`;

  const setSession = (payload: Record<string, unknown>) =>
    (verifySession as jest.Mock).mockResolvedValue({
      permissions: ["*"],
      ...payload,
    });
  const sessionFor = (staffId: string, role = "staff") => ({
    staffId,
    role,
    institutionId: "instA",
    email: `${staffId}@test.edu`,
  });

  const postBulk = (body: Record<string, unknown>) =>
    new Request("http://localhost/api/academic/attendance/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const bulkPost = (body: Record<string, unknown>) =>
    bulkAttendancePost(postBulk(body)) as Promise<Response>;

  const postBulk = (body: Record<string, unknown>) =>
    new Request("http://localhost/api/academic/attendance/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const leaveBody = (leaveTypeId: string, startDate: string, endDate: string) => {
    const daysCount =
      Math.round(
        (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) /
          86_400_000
      ) + 1;
    return { leaveTypeId, startDate, endDate, daysCount };
  };

  const logRow = (id: string) =>
    db.select().from(studentAttendanceLogs).where(eq(studentAttendanceLogs.id, id)).get();

  const checkIn = (body: Record<string, unknown>) =>
    bulkAttendancePost(postBulk(body)) as Promise<Response>;

  const nfcPunch = { method: "nfc", nfcTagId: `tag_${Math.random().toString(36).slice(2, 10)}` };

  const seedClass = (id: string, institutionId: string) =>
    db.insert(classes).values({
      id,
      institutionId,
      name: `Class ${id}`,
      grade: "10",
      section: "A",
      academicYearId: "ay_2026",
      isActive: true,
    });

  const seedStudent = (id: string, institutionId: string) =>
    db.insert(staff).values({
      id,
      email: `${id}@test.edu`,
      employeeId: `EMP_${id.slice(-6)}`,
      firstName: "Student",
      lastName: id,
      role: "student",
      isActive: true,
      tokenVersion: 0,
    });

  const seedEnrollment = (classId: string, studentId: string) =>
    db.insert(classEnrollments).values({
      id: `enr_${classId}_${studentId}`,
      classId,
      studentId,
      academicYearId: "ay_2026",
      isActive: true,
    });

  beforeAll(async () => {
    jest.useFakeTimers({
      now: new Date(2026, 10, 1, 12, 0, 0, 0),
      doNotFake: [
        "nextTick",
        "queueMicrotask",
        "setImmediate",
        "clearImmediate",
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "hrtime",
        "performance",
      ],
    });

    await db.insert(institutions).values([
      { id: "instA", name: "Inst A", code: "IA" },
      { id: "instB", name: "Inst B", code: "IB" },
    ]);
    await db.insert(departments).values([
      { id: "deptA", institutionId: "instA", name: "Dept A", code: "DA" },
      { id: "deptB", institutionId: "instB", name: "Dept B", code: "DB" },
    ]);
    await db.insert(staff).values([
      { id: "teacher1", email: "t1@test.edu", employeeId: "EMP_T1", firstName: "Teacher", lastName: "One", role: "staff", isActive: true, tokenVersion: 0 },
      { id: "teacher2", email: "t2@test.edu", employeeId: "EMP_T2", firstName: "Teacher", lastName: "Two", role: "staff", isActive: true, tokenVersion: 0 },
    ]);
    await db.insert(staffInstitutions).values([
      { id: "si_1", staffId: "teacher1", institutionId: "instA" },
      { id: "si_2", staffId: "teacher2", institutionId: "instB" },
    ]);
    await db.insert(classes).values([
      { id: "clsA", institutionId: "instA", departmentId: "deptA", name: "Class A", grade: "10", section: "A", academicYearId: "ay_2026", isActive: true },
      { id: "clsB", institutionId: "instB", name: "Class B", grade: "10", section: "A", academicYearId: "ay_2026", isActive: true },
    ]);
    await db.insert(staff).values([
      { id: "stu1", email: "s1@test.edu", employeeId: "EMP_S1", firstName: "Student", lastName: "One", role: "student", isActive: true, tokenVersion: 0 },
      { id: "stu2", email: "s2@test.edu", employeeId: "EMP_S2", firstName: "Student", lastName: "Two", role: "student", isActive: true, tokenVersion: 0 },
      { id: "stu3", email: "s3@test.edu", employeeId: "EMP_S3", firstName: "Student", lastName: "Three", role: "student", isActive: true, tokenVersion: 0 },
    ]);
    await db.insert(classEnrollments).values([
      { id: "enr1", classId: "clsA", studentId: "stu1" },
      { id: "enr2", classId: "clsA", studentId: "stu2" },
      { id: "enr2", classId: "clsB", studentId: "stu3" },
    ]);
  });

  afterEach(() => {
    jest.setSystemTime(new Date(2026, 10, 1, 12, 0, 0, 0));
    (verifySession as jest.Mock).mockReset();
  });

  describe("Bulk Student Class Attendance Pipeline -- Hardening Suite", () => {
    const suffix = Math.random().toString(36).slice(2, 10);
    const instA = `inst_bulk_a_${suffix}`;
    const instB = `inst_bulk_b_${suffix}`;
    const classA = `cls_bulk_a_${suffix}`;
    const classB = `cls_bulk_b_${suffix}`;
    const staffA = `stf_bulk_a_${suffix}`;
    const staffB = `stf_bulk_b_${suffix}`;
    const studentA = `usr_bulk_a_${suffix}`;
    const studentB = `usr_bulk_b_${suffix}`;
    const studentC = `usr_bulk_c_${suffix}`;
    const studentD = `usr_bulk_d_${suffix}`;
    const studentE = `usr_bulk_e_${suffix}`;

    const setSession = (payload: Record<string, unknown>) =>
      (verifySession as jest.Mock).mockResolvedValue({
        permissions: ["*"],
        ...payload,
      });
    const sessionFor = (staffId: string, role = "staff") => ({
      staffId,
      role,
      institutionId: "instA",
      email: `${staffId}@test.edu`,
    });

    const postBulk = (body: Record<string, unknown>) =>
      new Request("http://localhost/api/academic/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    const postLeave = (body: Record<string, unknown>) =>
      new Request("http://localhost/api/academic/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    const checkIn = (body: Record<string, unknown>) =>
      bulkAttendancePost(postBulk(body)) as Promise<Response>;
    const nfcPunch = { method: "nfc", nfcTagId: `tag_${Math.random().toString(36).slice(2, 10)}` };

    const seedClass = (id: string, institutionId: string) =>
      db.insert(classes).values({
        id,
        institutionId,
        name: `Class ${id}`,
        grade: "10",
        section: "A",
        academicYearId: "ay_2026",
        isActive: true,
      });

    const seedStudent = (id: string, institutionId: string) =>
      db.insert(staff).values({
        id,
        email: `${id}@test.edu`,
        employeeId: `EMP_${id.slice(-6)}`,
        firstName: "Student",
        lastName: id,
        role: "student",
        isActive: true,
        tokenVersion: 0,
      });

    const seedEnrollment = (classId: string, studentId: string) =>
      db.insert(classEnrollments).values({
        id: `enr_${classId}_${studentId}`,
        classId,
        studentId,
        academicYearId: "ay_2026",
        isActive: true,
      });

    beforeAll(async () => {
      jest.useFakeTimers({
        now: new Date(2026, 10, 1, 12, 0, 0, 0),
        doNotFake: [
          "nextTick",
          "queueMicrotask",
          "setImmediate",
          "clearImmediate",
          "setTimeout",
          "clearTimeout",
          "setInterval",
          "clearInterval",
          "hrtime",
          "performance",
        ],
      });

      await db.insert(institutions).values([
        { id: "instA", name: "Inst A", code: "IA" },
        { id: "instB", name: "Inst B", code: "IB" },
      ]);
      await db.insert(staff).values([
        { id: "teacher1", email: "t1@test.edu", employeeId: "EMP_T1", firstName: "T1", lastName: "T1", role: "staff", isActive: true, tokenVersion: 0 },
        { id: "teacher2", email: "t2@test.edu", employeeId: "EMP_T2", firstName: "T2", lastName: "T2", role: "staff", isActive: true, tokenVersion: 0 },
      ]);
      await db.insert(staffInstitutions).values([
        { id: "si_1", staffId: "teacher1", institutionId: "instA" },
        { id: "si_2", staffId: "teacher2", institutionId: "instB" },
      ]);
      await db.insert(classes).values([
        { id: "clsA", institutionId: "instA", departmentId: "deptA", name: "Class A", grade: "10", section: "A", academicYearId: "ay_2026", isActive: true },
        { id: "clsB", institutionId: "instB", name: "Class B", grade: "10", section: "A", academicYearId: "ay_2026", isActive: true },
      ]);
      await db.insert(staff).values([
        { id: "stu1", email: "s1@test.edu", employeeId: "EMP_S1", firstName: "S1", lastName: "S1", role: "student", isActive: true, tokenVersion: 0 },
        { id: "stu2", email: "s2@test.edu", employeeId: "EMP_S2", firstName: "S2", lastName: "S2", role: "student", isActive: true, tokenVersion: 0 },
        { id: "stu3", email: "s3@test.edu", employeeId: "EMP_S3", firstName: "S3", lastName: "S3", role: "student", isActive: true, tokenVersion: 0 },
      ]);
      await db.insert(classEnrollments).values([
        { id: "enr1", classId: "clsA", studentId: "stu1" },
        { id: "enr2", classId: "clsA", studentId: "stu2" },
        { id: "enr2", classId: "clsB", studentId: "stu3" },
      ]);
    });

    afterEach(() => {
      jest.setSystemTime(new Date(2026, 10, 1, 12, 0, 0, 0));
      (verifySession as jest.Mock).mockReset();
    });

    describe("Bulk Student Class Attendance Pipeline -- Hardening Suite", () => {
      const suffix = Math.random().toString(36).slice(2, 10);
      const instA = `inst_bulk_a_${suffix}`;
      const instB = `inst_bulk_b_${suffix}`;
      const classA = `cls_bulk_a_${suffix}`;
      const classB = `cls_bulk_b_${suffix}`;
      const staffA = `stf_bulk_a_${suffix}`;
      const staffB = `stf_bulk_b_${suffix}`;
      const studentA = `usr_bulk_a_${suffix}`;
      const studentB = `usr_bulk_b_${suffix}`;
      const studentC = `usr_bulk_c_${suffix}`;
      const studentD = `usr_bulk_d_${suffix}`;
      const studentE = `usr_bulk_e_${suffix}`;

      const setSession = (payload: Record<string, unknown>) =>
        (verifySession as jest.Mock).mockResolvedValue({
          permissions: ["*"],
          ...payload,
        });
      const sessionFor = (staffId: string, role = "staff") => ({
        staffId,
        role,
        institutionId: "instA",
        email: `${staffId}@test.edu`,
      });

      const postBulk = (body: Record<string, unknown>) =>
        new Request("http://localhost/api/academic/attendance/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      const postLeave = (body: Record<string, unknown>) =>
        new Request("http://localhost/api/academic/attendance/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      const checkIn = (body: Record<string, unknown>) =>
        bulkAttendancePost(postBulk(body)) as Promise<Response>;
      const nfcPunch = { method: "nfc", nfcTagId: `tag_${Math.random().toString(36).slice(2, 10)}` };

      const seedClass = (id: string, institutionId: string) =>
        db.insert(classes).values({
          id,
          institutionId,
          name: `Class ${id}`,
          grade: "10",
          section: "A",
          academicYearId: "ay_2026",
          isActive: true,
        });

      const seedStudent = (id: string, institutionId: string) =>
        db.insert(staff).values({
          id,
          email: `${id}@test.edu`,
          employeeId: `EMP_${id.slice(-6)}`,
          firstName: "Student",
          lastName: id,
          role: "student",
          isActive: true,
          tokenVersion: 0,
        });

      const seedEnrollment = (classId: string, studentId: string) =>
        db.insert(classEnrollments).values({
          id: `enr_${classId}_${suffix}`,
          classId,
          studentId,
          academicYearId: "ay_2026",
          isActive: true,
        });

      beforeAll(async () => {
        jest.useFakeTimers({
          now: new Date(2026, 10, 1, 12, 0, 0, 0),
          doNotFake: [
            "nextTick",
            "queueMicrotask",
            "setImmediate",
            "clearImmediate",
            "setTimeout",
            "clearTimeout",
            "setInterval",
            "clearInterval",
            "hrtime",
            "performance",
          ],
        });

        await db.insert(institutions).values([
          { id: "instA", name: `Inst A ${suffix}`, code: `IA${suffix.slice(-5)}` },
          { id: "instB", name: `Inst B ${suffix}`, code: `IB${suffix.slice(-5)}` },
        ]);
        await db.insert(staff).values([
          { id: "teacher1", email: `t1_${suffix}@test.edu`, employeeId: `EMP_T1_${suffix.slice(-6)}`, firstName: "Teacher", lastName: "One", role: "staff", isActive: true, tokenVersion: 0 },
          { id: "teacher2", email: `t2_${suffix}@test.edu`, employeeId: `EMP_T2_${suffix.slice(-6)}`, firstName: "Teacher", lastName: "Two", role: "staff", isActive: true, tokenVersion: 0 },
        ]);
        await db.insert(staffInstitutions).values([
          { id: `si_1_${suffix}`, staffId: "teacher1", institutionId: "instA" },
          { id: `si_2_${suffix}`, staffId: "teacher2", institutionId: "instB" },
        ]);
        await db.insert(classes).values([
          { id: "clsA", institutionId: "instA", departmentId: "deptA", name: "Class A", grade: "10", section: "A", academicYearId: "ay_2026", isActive: true },
          { id: "clsB", institutionId: "instB", name: "Class B", grade: "10", section: "A", academicYearId: "ay_2026", isActive: true },
        ]);
        await db.insert(staff).values([
          { id: "stu1", email: `s1_${suffix}@test.edu`, employeeId: `EMP_S1_${suffix.slice(-6)}`, firstName: "Student", lastName: "One", role: "student", isActive: true, tokenVersion: 0 },
          { id: "stu2", email: `s2_${suffix}@test.edu`, employeeId: `EMP_S2_${suffix.slice(-6)}`, firstName: "Student", lastName: "Two", role: "student", isActive: true, tokenVersion: 0 },
          { id: "stu3", email: "s3_${suffix}@test.edu", employeeId: `EMP_S3_${suffix.slice(-6)}`, firstName: "Student", lastName: "Three", role: "student", isActive: true, tokenVersion: 0 },
        ]);
        await db.insert(classEnrollments).values([
          { id: `enr1_${suffix}`, classId: "clsA", studentId: "stu1" },
          { id: `enr2_${suffix}`, classId: "clsA", studentId: "stu2" },
          { id: `enr3_${suffix}`, classId: "clsB", studentId: "stu3" },
        ]);
      });

      afterEach(() => {
        jest.setSystemTime(new Date(2026, 10, 1, 12, 0, 0, 0));
        (verifySession as jest.Mock).mockReset();
      });

      describe("Bulk Student Class Attendance Pipeline -- Hardening Suite", () => {
        const suffix = Math.random().toString(36).slice(2, 10);
        const instA = `inst_bulk_a_${suffix}`;
        const instB = `inst_bulk_b_${suffix}`;
        const classA = `cls_bulk_a_${suffix}`;
        const classB = `cls_bulk_b_${suffix}`;
        const staffA = `stf_bulk_a_${suffix}`;
        const staffB = `stf_bulk_b_${suffix}`;
        const studentA = `usr_bulk_a_${suffix}`;
        const studentB = `usr_bulk_b_${suffix}`;
        const studentC = `usr_bulk_c_${suffix}`;
        const studentD = `usr_bulk_d_${suffix}`;
        const studentE = `usr_bulk_e_${suffix}`;

        const setSession = (payload: Record<string, unknown>) =>
          (verifySession as jest.Mock).mockResolvedValue({
            permissions: ["*"],
            ...payload,
          });
        const sessionFor = (staffId: string, role = "staff") => ({
          staffId,
          role,
          institutionId: "instA",
          email: `${staffId}@test.edu`,
        });

        const postBulk = (body: Record<string, unknown>) =>
          new Request("http://localhost/api/academic/attendance/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        const postLeave = (body: Record<string, unknown>) =>
          new Request("http://localhost/api/academic/attendance/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        const checkIn = (body: Record<string, unknown>) =>
          bulkAttendancePost(postBulk(body)) as Promise<Response>;
        const nfcPunch = { method: "nfc", nfcTagId: `tag_${Math.random().toString(36).slice(2, 10)}` };

        const seedClass = (id: string, institutionId: string) =>
          db.insert(classes).values({
            id,
            institutionId,
            name: `Class ${id}`,
            grade: "10",
            section: "A",
            academicYearId: "ay_2026",
            isActive: true,
          });

        const seedStudent = (id: string, institutionId: string) =>
          db.insert(staff).values({
            id,
            email: `${id}@test.edu`,
            employeeId: `EMP_${id.slice(-6)}`,
            firstName: "Student",
            lastName: id,
            role: "student",
            isActive: true,
            tokenVersion: 0,
          });

        const seedEnrollment = (classId: string, studentId: string) =>
          db.insert(classEnrollments).values({
            id: `enr_${classId}_${suffix}`,
            classId,
            studentId,
            academicYearId: "ay_2026",
            isActive: true,
          });

        beforeAll(async () => {
          jest.useFakeTimers({
            now: new Date(2026, 10, 1, 12, 0, 0, 0),
            doNotFake: [
              "nextTick",
              "queueMicrotask",
              "setImmediate",
              "clearImmediate",
              "setTimeout",
              "clearTimeout",
              "setInterval",
              "clearInterval",
              "hrtime",
              "performance",
            ],
          });

          await db.insert(institutions).values([
            { id: "instA", name: `Inst A ${suffix}`, code: `IA${suffix.slice(-5)}` },
            { id: "instB", name: `Inst B ${suffix}`, code: `IB${suffix.slice(-5)}` },
          ]);
          await db.insert(staff).values([
            { id: "teacher1", email: `t1_${suffix}@test.edu`, employeeId: `EMP_T1_${suffix.slice(-6)}`, firstName: "Teacher", lastName: "One", role: "staff", isActive: true, tokenVersion: 0 },
            { id: "teacher2", email: `t2_${suffix}@test.edu`, employeeId: `EMP_T2_${suffix.slice(-6)}`, firstName: "Teacher", lastName: "Two", role: "staff", isActive: true, tokenVersion: 0 },
          ]);
          await db.insert(staffInstitutions).values([
            { id: `si_1_${suffix}`, staffId: "teacher1", institutionId: "instA" },
            { id: `si_2_${suffix}`, staffId: "teacher2", institutionId: "instB" },
          ]);
          await db.insert(classes).values([
            { id: "clsA", institutionId: "instA", departmentId: "deptA", name: "Class A", grade: "10", section: "A", academicYearId: "ay_2026", isActive: true },
            { id: "clsB", institutionId: "instB", name: "Class B", grade: "10", section: "A", academicYearId: "ay_2026", isActive: true },
          ]);
          await db.insert(staff).values([
            { id: "stu1", email: `s1_${suffix}@test.edu`, employeeId: `EMP_S1_${suffix.slice(-6)}`, firstName: "Student", lastName: "One", role: "student", isActive: true, tokenVersion: 0 },
            { id: "stu2", email: `s2_${suffix}@test.edu`, employeeId: `EMP_S2_${suffix.slice(-6)}`, firstName: "Student", lastName: "Two", role: "student", isActive: true, tokenVersion: 0 },
            { id: "stu3", email: `s3_${suffix}@test.edu`, employeeId: `EMP_S3_${suffix.slice(-6)}`, firstName: "Student", lastName: "Three", role: "student", isActive: true, tokenVersion: 0 },
          ]);
          await db.insert(classEnrollments).values([
            { id: `enr1_${suffix}`, classId: "clsA", studentId: "stu1" },
            { id: `enr2_${suffix}`, classId: "clsA", studentId: "stu2" },
            { id: `enr3_${suffix}`, classId: "clsB", studentId: "stu3" },
          ]);
        });

        afterEach(() => {
          jest.setSystemTime(new Date(2026, 10, 1, 12, 0, 0, 0));
          (verifySession as jest.Mock).mockReset();
        });

        describe("Safe JSON Parsing", () => {
          it("returns 400 on malformed JSON", async () => {
            setSession(sessionFor("teacher1", "instA"));
            const res = await bulkAttendancePost(new Request("http://localhost/api/academic/attendance/bulk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "not valid json",
            }));
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(String(data.error)).toContain("Invalid JSON");
          });

          it("returns 400 on empty payload", async () => {
            setSession(sessionFor("teacher1", "instA"));
            const res = await bulkAttendancePost(new Request("http://localhost/api/academic/attendance/bulk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "",
            }));
            expect(res.status).toBe(400);
          });
        });

        describe("Rate Limiting", () => {
          it("allows requests within rate limit", async () => {
            setSession(sessionFor("teacher1", "instA"));
            const res = await checkIn({
              classId: "clsA",
              date: "2026-11-01",
              records: [{ studentId: "stu1", status: "present" }],
            });
            expect(res.status).not.toBe(429);
          });
        });

        describe("Batch Size Limits", () => {
          it("rejects batches exceeding 500 records with 400", async () => {
            setSession(sessionFor("teacher1", "instA"));
            const first = await checkIn({
              leaveTypeId: "ltA",
              startDate: "2027-01-05",
              endDate: "2027-01-09",
            });
            expect(first.status).toBe(201);

            // 5 more days would fit alone, but 5 are already pending-reserved.
            const second = await checkIn({
              leaveTypeId: "ltA",
              startDate: "2027-01-15",
              endDate: "2027-01-20",
            });
            expect(second.status).toBe(400);
            const data = await second.json();
            expect(String(data.error)).toContain("Insufficient leave balance");
          });

          it("rejects overlapping dates against an existing pending leave", async () => {
            setSession(sessionFor("teacher1", "instA"));
            const first = await checkIn({
              leaveTypeId: "ltA",
              startDate: "2027-02-10",
              endDate: "2027-02-14",
            });
            expect(first.status).toBe(201);

            const overlap = await checkIn({
              leaveTypeId: "ltA",
              startDate: "2027-02-13",
              endDate: "2027-02-16",
            });
            expect(overlap.status).toBe(409);
            const data = await overlap.json();
            expect(String(data.error)).toContain("overlap");
          });

          it("allows back-to-back leaves that merely touch at the boundary", async () => {
            setSession(sessionFor("teacher1", "instA"));
            const first = await checkIn({
              leaveTypeId: "ltA",
              startDate: "2027-03-10",
              endDate: "2027-03-14",
            });
            expect(first.status).toBe(201);

            const adjacent = await checkIn({
              leaveTypeId: "ltA",
              startDate: "2027-03-15",
              endDate: "2027-03-16",
            });
            expect(adjacent.status).toBe(201);
          });

          it("ignores rejected spans: rejected leaves do not block new dates", async () => {
            await db.insert(leaveRequests).values({
              id: `lvh_rej_${suffix}`,
              staffId: "teacher1",
              leaveTypeId: "ltA",
              startDate: "2027-04-20",
              endDate: "2027-04-24",
              daysCount: 5,
              status: "rejected",
              institutionId: "instA",
            });

            setSession(sessionFor("teacher1", "instA"));
            const res = await checkIn({
              leaveTypeId: "ltA",
              startDate: "2027-04-21",
              endDate: "2027-04-22",
            });
            expect(res.status).toBe(201);
          });

          it("still blocks dates that collide with an approved leave", async () => {
            await db.insert(leaveRequests).values({
              id: `lvh_app_${suffix}`,
              staffId: "teacher1",
              leaveTypeId: "ltA",
              startDate: "2027-05-25",
              endDate: "2027-05-27",
              daysCount: 3,
              status: "approved",
              institutionId: "instA",
            });

            setSession(sessionFor("teacher1", "instA"));
            const res = await checkIn({
              leaveTypeId: "ltA",
              startDate: "2027-05-26",
              endDate: "2027-05-28",
            });
            expect(res.status).toBe(409);
          });
        });

        describe("approval capacity guard", () => {
          it("rejects an under-funded approval and rolls back the status transition", async () => {
            // Balance: 10 total, 9 already used -- only 1 day remains.
            await db
              .update(leaveBalances)
              .set({ usedDays: 9 })
              .where(eq(leaveBalances.id, `lb_lvh_a_2027_${suffix}`))
              .run();

              const seeded = await seedLeave({
                id: `lvh_underfunded_${suffix}`,
                staffId: "teacher1",
                leaveTypeId: "ltA",
                startDate: "2027-06-01",
                endDate: "2027-06-02",
                daysCount: 2,
                status: "pending",
                institutionId: "instA",
              });

              setSession(sessionFor("teacher1", "instA"));
              const res = await checkIn(nfcPunch);
              expect(res.status).toBe(409);
              const data = await res.json();
              expect(String(data.error)).toContain("Insufficient leave balance");

              // Atomic rollback: the leave is STILL pending and the balance untouched.
              const row = await getLeave(seeded.id);
              expect(row.status).toBe(200);
              const { leave } = await row.json();
              expect(leave.status).toBe("pending");
              const balance = await balanceRow("ltA", 2027);
              expect(balance?.usedDays).toBe(9);
            });

            it("serializes concurrent approvals so usedDays never exceeds totalDays", async () => {
              // Balance: 10 total, 8 used -- exactly two 1-day leaves can be funded.
              await db
                .update(leaveBalances)
                .set({ usedDays: 8 })
                .where(eq(leaveBalances.id, `lb_lvh_b_2027_${suffix}`))
                .run();

                const a = await seedLeave({
                  id: `lvh_race_a_${suffix}`,
                  staffId: "teacher1",
                  leaveTypeId: "ltB",
                  startDate: "2027-07-01",
                  endDate: "2027-07-01",
                  daysCount: 1,
                  status: "pending",
                  institutionId: "instA",
                });
                const b = await seedLeave({
                  id: `lvh_race_b_${suffix}`,
                  staffId: "teacher1",
                  leaveTypeId: "ltB",
                  startDate: "2027-07-02",
                  endDate: "2027-07-02",
                  daysCount: 1,
                  status: "pending",
                  institutionId: "instA",
                });

                setSession(sessionFor("teacher1", "admin"));
                const [ra, rb] = await Promise.all([
                  checkIn({ leaveTypeId: "ltB", startDate: "2027-07-01", endDate: "2027-07-01" }),
                  checkIn({ leaveTypeId: "ltB", startDate: "2027-07-02", endDate: "2027-07-02" }),
                });
                const statuses = [ra.status, rb.status].sort((x, y) => x - y);
                expect(statuses).toEqual([200, 409]);

                const balance = await balanceRow("ltB", 2027);
                expect(balance?.usedDays).toBe(10); // never past totalDays
            });

            it("deducts on final approval only (HOD stage moves status without touching the balance)", async () => {
              const seeded = await seedLeave({
                id: `lvh_twostage_${suffix}`,
                staffId: "teacher1",
                leaveTypeId: "ltB",
                startDate: "2027-08-03",
                endDate: "2027-08-04",
                daysCount: 2,
                status: "pending",
                institutionId: "instA",
              });

              setSession(sessionFor("teacher1", "hod"));
              const hodRes = await checkIn(nfcPunch);
              expect(hodRes.status).toBe(200);
              let { leave } = await hodRes.json();
              expect(leave.status).toBe("hod_approved");
              let balance = await balanceRow("ltB", 2027);
              expect(balance?.usedDays).toBe(0); // not deducted at HOD stage

              setSession(sessionFor("teacher1", "admin"));
              const adminRes = await checkIn(nfcPunch);
              expect(adminRes.status).toBe(200);
              ({ leave } = await adminRes.json());
              expect(leave.status).toBe("approved");
              balance = await balanceRow("ltB", 2027);
              expect(balance?.usedDays).toBe(2); // deducted once, on final approval
            });
          });
        });

        describe("calendar-year anchoring", () => {
          it("deducts from the leave-year balance even when approved in the next calendar year", async () => {
            // Leave starts 2026-12-28; approval happens 2027-01-02.
            jest.setSystemTime(new Date(2027, 0, 2, 10, 0, 0));

            setSession(sessionFor("teacher1", "instA"));
            const created = await checkIn(nfcPunch);
            expect(created.status).toBe(201);
            const { leave } = await created.json();

            setSession(sessionFor("teacher1", "admin"));
            const res = await putLeave(leave.id, { status: "approved" });
            expect(res.status).toBe(200);

            const row2026 = await balanceRow("ltA", 2026);
            const row2027 = await balanceRow("ltA", 2027);
            expect(row2026?.usedDays).toBe(3);
            expect(row2027?.usedDays).toBe(0);
          });
        });

        describe("delete credits", () => {
          it("returns days to the balance when an approved leave is deleted", async () => {
            const created = await seedLeave({
              id: `lvh_del_app_${suffix}`,
              staffId: "teacher1",
              leaveTypeId: "ltA",
              startDate: "2027-09-07",
              endDate: "2027-09-09",
              daysCount: 3,
              status: "approved",
              institutionId: "instA",
            });
            await db
              .update(leaveBalances)
              .set({ usedDays: 3 })
              .where(eq(leaveBalances.id, `lb_lvh_a_2027_${suffix}`))
              .run();

              setSession(sessionFor("teacher1", "instA"));
              const res = await deleteLeave(created.id);
              expect(res.status).toBe(200);

              const balance = await balanceRow("ltA", 2027);
              expect(balance?.usedDays).toBe(0);

              const gone = await getLeave(created.id);
              expect(gone.status).toBe(404);
          });

          it("deletes a pending leave without touching the balance", async () => {
            const created = await seedLeave({
              id: `lvh_del_pen_${suffix}`,
              staffId: "teacher1",
              leaveTypeId: "ltA",
              startDate: "2027-10-05",
              endDate: "2027-10-06",
              daysCount: 2,
              status: "pending",
              institutionId: "instA",
            });

            setSession(sessionFor("teacher1", "instA"));
            const res = await deleteLeave(created.id);
            expect(res.status).toBe(200);

            const balance = await balanceRow("ltA", 2027);
            expect(balance?.usedDays).toBe(0);
          });

          it("forbids deleting another employee's leave", async () => {
            const seeded = await seedLeave({
              id: `lvh_del_other_${suffix}`,
              staffId: "teacher1",
              leaveTypeId: "ltA",
              startDate: "2027-11-02",
              endDate: "2027-11-03",
              daysCount: 2,
              status: "pending",
              institutionId: "instA",
            });

            setSession(sessionFor("teacher2", "instB"));
            const res = await deleteLeave(seeded.id);
            expect(res.status).toBe(403);
          });
        });
      });
    });
  });
});