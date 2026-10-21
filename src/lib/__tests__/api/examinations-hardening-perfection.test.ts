/**
 * @jest-environment node
 *
 * Academic Examinations & Grading Pipeline Perfection & Hardening Suite:
 * - Safe JSON parsing across all mutating endpoints (400 on malformed payloads)
 * - Schema bounds & date/mark integrity (startDate <= endDate, passMarks <= maxMarks)
 * - Conflict & duplicate prevention (409 Conflict on duplicate exam session or subject schedule)
 * - Safe server-side pagination clamping (limit clamped to <= 100)
 */

import {
  db,
  institutions,
  staff,
  staffInstitutions,
  exams,
  examSchedules,
  students,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import { GET as getExams, POST as createExam } from "@/app/api/examinations/exams/route";
import { PATCH as patchExamById } from "@/app/api/examinations/exams/[id]/route";
import { POST as createSchedule } from "@/app/api/examinations/schedules/route";
import { POST as postMarksBatch } from "@/app/api/examinations/marks/batch/route";
import { POST as postMarksModerate } from "@/app/api/examinations/marks/moderate/route";
import { POST as postHallTicket } from "@/app/api/examinations/hall-tickets/route";
import { POST as verifyHallTicket } from "@/app/api/examinations/hall-tickets/verify/route";
import { POST as publishReportCards } from "@/app/api/examinations/report-cards/publish/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Examinations Pipeline Perfection Suite", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_exam_perf_${suffix}`;
  const adminAId = `stf_exam_adm_${suffix}`;
  const studentAId = `stu_exam_${suffix}`;
  const examAId = `exam_perf_${suffix}`;
  const scheduleAId = `sched_perf_${suffix}`;

  beforeAll(async () => {
    // Seed Institution
    await db.insert(institutions).values({
      id: instA,
      name: "Examinations Testing Institute",
      code: `ETI_${suffix}`,
    }).run();

    // Seed Admin Staff
    await db.insert(staff).values({
      id: adminAId,
      email: `examadmin_${suffix}@thaiba.edu`,
      employeeId: `EMP_EXAM_${suffix}`,
      firstName: "Exam",
      lastName: "Coordinator",
      role: "admin",
      isActive: true,
    }).run();

    await db.insert(staffInstitutions).values({
      id: `si_exam_${suffix}`,
      staffId: adminAId,
      institutionId: instA,
    }).run();

    // Seed Student
    await db.insert(students).values({
      id: studentAId,
      institutionId: instA,
      studentId: `STU_EX_${suffix}`,
      firstName: "Test",
      lastName: "Candidate",
      admissionNo: `ADM_EX_${suffix}`,
      email: `candidate_${suffix}@thaiba.edu`,
      status: "active",
    }).run();

    // Seed Exam
    await db.insert(exams).values({
      id: examAId,
      institutionId: instA,
      title: `Midterm Assessment ${suffix}`,
      academicYear: "2026-2027",
      term: "Term 1",
      startDate: "2026-10-01",
      endDate: "2026-10-15",
      status: "scheduled",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).run();

    // Seed Schedule
    await db.insert(examSchedules).values({
      id: scheduleAId,
      examId: examAId,
      subjectName: "Mathematics",
      examDate: "2026-10-05",
      startTime: "09:00",
      endTime: "12:00",
      durationMinutes: 180,
      maxMarks: 100,
      passMarks: 40,
      roomNumber: "Hall-101",
      createdAt: new Date().toISOString(),
    }).run();
  });

  afterAll(async () => {
    await db.delete(examSchedules).where(eq(examSchedules.id, scheduleAId)).run();
    await db.delete(exams).where(eq(exams.id, examAId)).run();
    await db.delete(students).where(eq(students.id, studentAId)).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.id, `si_exam_${suffix}`)).run();
    await db.delete(staff).where(eq(staff.id, adminAId)).run();
    await db.delete(institutions).where(eq(institutions.id, instA)).run();
  });

  describe("1. Safe JSON Parsing Across All Mutating Endpoints", () => {
    beforeEach(() => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: adminAId,
        role: "admin",
        institutionId: instA,
      });
    });

    it("POST /api/examinations/exams returns 400 on malformed JSON", async () => {
      const req = new Request("http://localhost/api/examinations/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ bad json payload",
      });
      const res = await createExam(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("PATCH /api/examinations/exams/[id] returns 400 on malformed JSON", async () => {
      const req = new Request(`http://localhost/api/examinations/exams/${examAId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "not a json string",
      });
      const res = await patchExamById(req, { params: Promise.resolve({ id: examAId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/examinations/schedules returns 400 on malformed JSON", async () => {
      const req = new Request("http://localhost/api/examinations/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "broken",
      });
      const res = await createSchedule(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/examinations/marks/batch returns 400 on malformed JSON", async () => {
      const req = new Request("http://localhost/api/examinations/marks/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid",
      });
      const res = await postMarksBatch(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/examinations/marks/moderate returns 400 on malformed JSON", async () => {
      const req = new Request("http://localhost/api/examinations/marks/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "bad json",
      });
      const res = await postMarksModerate(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/examinations/hall-tickets returns 400 on malformed JSON", async () => {
      const req = new Request("http://localhost/api/examinations/hall-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      });
      const res = await postHallTicket(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/examinations/hall-tickets/verify returns 400 on malformed JSON", async () => {
      const req = new Request("http://localhost/api/examinations/hall-tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "corrupt",
      });
      const res = await verifyHallTicket(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/examinations/report-cards/publish returns 400 on malformed JSON", async () => {
      const req = new Request("http://localhost/api/examinations/report-cards/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ error:",
      });
      const res = await publishReportCards(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });
  });

  describe("2. Schema Bounds & Integrity Validation", () => {
    beforeEach(() => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: adminAId,
        role: "admin",
        institutionId: instA,
      });
    });

    it("rejects exam creation when startDate is after endDate", async () => {
      const req = new Request("http://localhost/api/examinations/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Inverted Dates ${suffix}`,
          academicYear: "2026-2027",
          term: "Term 1",
          startDate: "2026-10-20",
          endDate: "2026-10-10", // before startDate
          institutionId: instA,
        }),
      });
      const res = await createExam(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/endDate must be on or after startDate/i);
    });

    it("rejects schedule creation when passMarks exceeds maxMarks", async () => {
      const req = new Request("http://localhost/api/examinations/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: examAId,
          subjectName: "Physics",
          examDate: "2026-10-06",
          startTime: "09:00",
          endTime: "12:00",
          durationMinutes: 180,
          maxMarks: 50,
          passMarks: 75, // passMarks > maxMarks
        }),
      });
      const res = await createSchedule(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/passMarks cannot exceed maxMarks/i);
    });

    it("rejects batch mark entry when marksObtained exceeds schedule.maxMarks", async () => {
      const req = new Request("http://localhost/api/examinations/marks/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examScheduleId: scheduleAId,
          entries: [
            {
              studentId: studentAId,
              marksObtained: 150, // schedule maxMarks is 100
              isAbsent: false,
            },
          ],
        }),
      });
      const res = await postMarksBatch(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Must be between 0 and max marks/i);
    });
  });

  describe("3. Collision & Duplicate Prevention (409 Conflict)", () => {
    beforeEach(() => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: adminAId,
        role: "admin",
        institutionId: instA,
      });
    });

    it("returns 409 Conflict when creating an exam with identical title, academicYear, and term", async () => {
      const req = new Request("http://localhost/api/examinations/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `midterm assessment ${suffix}`, // case variation
          academicYear: "2026-2027",
          term: "Term 1",
          startDate: "2026-10-01",
          endDate: "2026-10-15",
          institutionId: instA,
        }),
      });
      const res = await createExam(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/already exists/i);
    });

    it("returns 409 Conflict when scheduling the same subject twice in the same exam session", async () => {
      const req = new Request("http://localhost/api/examinations/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: examAId,
          subjectName: "mathematics", // case variation of already scheduled Mathematics
          examDate: "2026-10-08",
          startTime: "09:00",
          endTime: "12:00",
          durationMinutes: 180,
          maxMarks: 100,
          passMarks: 40,
        }),
      });
      const res = await createSchedule(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/already exists in this examination/i);
    });
  });

  describe("4. Safe Query Pagination Clamping", () => {
    beforeEach(() => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: adminAId,
        role: "admin",
        institutionId: instA,
      });
    });

    it("clamps limit parameter to 100 and succeeds without throwing ZodError", async () => {
      const req = new Request("http://localhost/api/examinations/exams?page=1&limit=500");
      const res = await getExams(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.limit).toBe(100);
      expect(Array.isArray(json.exams)).toBe(true);
    });
  });
});
