/** @jest-environment node */
import { POST as createExam } from "@/app/api/examinations/exams/route";
import { POST as createSchedule } from "@/app/api/examinations/schedules/route";
import { POST as issueHallTicket } from "@/app/api/examinations/hall-tickets/route";
import { POST as moderateMark } from "@/app/api/examinations/marks/moderate/route";
import { GET as getReportCard } from "@/app/api/examinations/report-cards/route";
import { checkStudentFeeClearance } from "@/lib/examinations/hall-ticket-service";
import { verifySession, hasPermission } from "@thaiba/auth";
import { db } from "@/db";
import {
  institutions,
  staff,
  staffInstitutions,
  exams,
  examSchedules,
  markEntries,
  students,
  examAuditLogs,
} from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

jest.mock("@/lib/examinations/hall-ticket-service", () => ({
  ...jest.requireActual("@/lib/examinations/hall-ticket-service"),
  checkStudentFeeClearance: jest.fn(),
}));

describe("Academic & Examination API Hardening Suites", () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  const instId = `inst_exam_hard_${suffix}`;
  const otherInstId = `inst_exam_other_${suffix}`;
  const staffId = `stf_admin_${suffix}`;

  const setSession = (role = "admin", inst = instId) => {
    (verifySession as jest.Mock).mockResolvedValue({
      userId: staffId,
      staffId,
      email: `${staffId}@thaiba.edu`,
      role,
      institutionId: inst,
      permissions: ["*"],
    });
    (hasPermission as jest.Mock).mockReturnValue(true);
  };

  const makeReq = (url: string, body?: unknown, method = "POST"): Request =>
    new Request(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  beforeAll(async () => {
    // Seed institutions
    await db.insert(institutions).values([
      { id: instId, name: `Hardening School ${suffix}`, code: `HS-${suffix}` },
      { id: otherInstId, name: `Other School ${suffix}`, code: `OS-${suffix}` },
    ]);

    // Seed staff and institution membership
    await db.insert(staff).values({
      id: staffId,
      email: `${staffId}@thaiba.edu`,
      employeeId: `EMP-${suffix}`,
      firstName: "Hardening",
      lastName: "Examiner",
      role: "admin",
      isActive: true,
      tokenVersion: 0,
    });

    await db.insert(staffInstitutions).values({
      id: `si_${suffix}`,
      staffId,
      institutionId: instId,
    });
  });

  beforeEach(() => {
    setSession("admin", instId);
  });

  describe("1. Exam Session Boundary & Overlap Hardening", () => {
    it("rejects exam creation when endDate is before startDate with 400", async () => {
      const req = makeReq("http://localhost/api/examinations/exams", {
        title: `Invalid Date Exam ${suffix}`,
        academicYear: "2026-2027",
        term: "Term-1",
        startDate: "2026-11-15",
        endDate: "2026-11-10", // Inverted
        institutionId: instId,
      });

      const res = await createExam(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/endDate must be on or after startDate/i);
    });

    it("rejects duplicate exam session in same institution, year, and term with 409", async () => {
      const payload = {
        title: `Midterm Session ${suffix}`,
        academicYear: "2026-2027",
        term: "Term-1",
        startDate: "2026-11-01",
        endDate: "2026-11-20",
        institutionId: instId,
      };

      // First creation succeeds
      const res1 = await createExam(makeReq("http://localhost/api/examinations/exams", payload));
      expect(res1.status).toBe(201);

      // Duplicate creation fails with 409
      const res2 = await createExam(makeReq("http://localhost/api/examinations/exams", payload));
      expect(res2.status).toBe(409);
      const json = await res2.json();
      expect(json.error).toMatch(/already exists/i);
    });
  });

  describe("2. Examination Schedules Collision & Time Bounds Hardening", () => {
    let examId: string;

    beforeAll(async () => {
      examId = `exam_sched_${suffix}`;
      await db.insert(exams).values({
        id: examId,
        institutionId: instId,
        title: `Schedule Test Exam ${suffix}`,
        academicYear: "2026-2027",
        term: "Term-1",
        startDate: "2026-11-01",
        endDate: "2026-11-30",
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    it("rejects schedule when startTime equals endTime or is inverted", async () => {
      const req1 = makeReq("http://localhost/api/examinations/schedules", {
        examId,
        subjectName: `Math-Boundary-${suffix}`,
        examDate: "2026-11-10",
        startTime: "10:00",
        endTime: "10:00", // Equal
        maxMarks: 100,
        passMarks: 40,
      });

      const res1 = await createSchedule(req1);
      expect(res1.status).toBe(400);
      const json1 = await res1.json();
      expect(json1.error).toMatch(/endTime must be after startTime/i);

      const req2 = makeReq("http://localhost/api/examinations/schedules", {
        examId,
        subjectName: `Math-Inverted-${suffix}`,
        examDate: "2026-11-10",
        startTime: "11:00",
        endTime: "09:00", // Inverted
        maxMarks: 100,
        passMarks: 40,
      });

      const res2 = await createSchedule(req2);
      expect(res2.status).toBe(400);
    });

    it("rejects schedule date outside the exam session window", async () => {
      const req = makeReq("http://localhost/api/examinations/schedules", {
        examId,
        subjectName: `Physics-${suffix}`,
        examDate: "2026-12-05", // Outside window (ends 2026-11-30)
        startTime: "09:00",
        endTime: "12:00",
        maxMarks: 100,
        passMarks: 40,
      });

      const res = await createSchedule(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/outside the examination window/i);
    });

    it("prevents room overlapping intervals while allowing adjacent non-overlapping slots", async () => {
      const roomNumber = `Hall-B-${suffix}`;

      // Slot 1: 09:00 to 11:00 in Hall-B
      const res1 = await createSchedule(
        makeReq("http://localhost/api/examinations/schedules", {
          examId,
          subjectName: `Biology-${suffix}`,
          examDate: "2026-11-15",
          startTime: "09:00",
          endTime: "11:00",
          roomNumber,
          maxMarks: 100,
          passMarks: 40,
        })
      );
      expect(res1.status).toBe(201);

      // Overlapping slot: 10:00 to 12:00 in same room -> 400 Conflict
      const resOverlap = await createSchedule(
        makeReq("http://localhost/api/examinations/schedules", {
          examId,
          subjectName: `Chemistry-Overlap-${suffix}`,
          examDate: "2026-11-15",
          startTime: "10:00",
          endTime: "12:00",
          roomNumber,
          maxMarks: 100,
          passMarks: 40,
        })
      );
      expect([400, 409]).toContain(resOverlap.status);
      const overlapJson = await resOverlap.json();
      expect(overlapJson.error).toMatch(/Room.*conflict/i);

      // Adjacent slot: 11:00 to 13:00 in same room -> Allowed 201
      const resAdjacent = await createSchedule(
        makeReq("http://localhost/api/examinations/schedules", {
          examId,
          subjectName: `Chemistry-Adjacent-${suffix}`,
          examDate: "2026-11-15",
          startTime: "11:00",
          endTime: "13:00",
          roomNumber,
          maxMarks: 100,
          passMarks: 40,
        })
      );
      expect(resAdjacent.status).toBe(201);
    });
  });

  describe("3. Hall Ticket Administrative Fee Override Audit Trail", () => {
    let studentId: string;
    let examId: string;

    beforeAll(async () => {
      studentId = `stud_fee_${suffix}`;
      examId = `exam_ht_${suffix}`;

      await db.insert(exams).values({
        id: examId,
        institutionId: instId,
        title: `HT Exam ${suffix}`,
        academicYear: "2026-2027",
        term: "Term-1",
        startDate: "2026-11-01",
        endDate: "2026-11-30",
        status: "ongoing",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.insert(students).values({
        id: studentId,
        institutionId: instId,
        admissionNo: `ADM-FEE-${suffix}`,
        firstName: "Student",
        lastName: `Defaulter-${suffix}`,
        dateOfBirth: "2006-05-20",
        isActive: true,
      });
    });

    it("blocks hall ticket issuance when student has unpaid dues and overrideFeeLock=false", async () => {
      (checkStudentFeeClearance as jest.Mock).mockResolvedValueOnce({
        feeCleared: false,
        pendingAmount: 350.0,
      });

      const res = await issueHallTicket(
        makeReq("http://localhost/api/examinations/hall-tickets", {
          examId,
          studentId,
          overrideFeeLock: false,
        })
      );

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.feeCleared).toBe(false);
      expect(json.pendingAmount).toBe(350.0);
    });

    it("grants hall ticket and logs audit record when overrideFeeLock=true", async () => {
      (checkStudentFeeClearance as jest.Mock).mockResolvedValueOnce({
        feeCleared: false,
        pendingAmount: 350.0,
      });

      const reason = "Dean financial exemption approved";
      const res = await issueHallTicket(
        makeReq("http://localhost/api/examinations/hall-tickets", {
          examId,
          studentId,
          overrideFeeLock: true,
          overrideReason: reason,
        })
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.hallTicket.overrideFeeLock).toBe(true);
      expect(json.hallTicket.overrideByStaffId).toBe(staffId);

      // Verify audit log row
      const audit = await db
        .select()
        .from(examAuditLogs)
        .where(
          and(
            eq(examAuditLogs.examId, examId),
            eq(examAuditLogs.action, "override_fee_lock")
          )
        )
        .get();

      expect(audit).toBeDefined();
      expect(audit?.performedByStaffId).toBe(staffId);
      expect(audit?.reason).toBe(reason);
    });
  });

  describe("4. Mark Moderation Concurrency & Idempotency", () => {
    let markEntryId: string;
    let scheduleId: string;
    let examId: string;

    beforeAll(async () => {
      examId = `exam_mod_${suffix}`;
      scheduleId = `sched_mod_${suffix}`;
      markEntryId = `entry_mod_${suffix}`;

      await db.insert(exams).values({
        id: examId,
        institutionId: instId,
        title: `Moderation Exam ${suffix}`,
        academicYear: "2026-2027",
        term: "Term-1",
        startDate: "2026-11-01",
        endDate: "2026-11-30",
        status: "in_progress",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.insert(examSchedules).values({
        id: scheduleId,
        examId,
        subjectName: `Literature-${suffix}`,
        examDate: "2026-11-10",
        startTime: "09:00",
        endTime: "12:00",
        maxMarks: 100,
        passMarks: 40,
        createdAt: new Date().toISOString(),
      });

      await db.insert(markEntries).values({
        id: markEntryId,
        examScheduleId: scheduleId,
        studentId: `stud_fee_${suffix}`,
        marksObtained: 78,
        status: "submitted",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    it("approves mark entry and blocks second concurrent approval with 409", async () => {
      // First moderation approval succeeds
      const res1 = await moderateMark(
        makeReq("http://localhost/api/examinations/marks/moderate", {
          markEntryId,
          action: "approve",
        })
      );
      expect(res1.status).toBe(200);

      // Second moderation approval returns 409 Conflict
      const res2 = await moderateMark(
        makeReq("http://localhost/api/examinations/marks/moderate", {
          markEntryId,
          action: "approve",
        })
      );
      expect(res2.status).toBe(409);
      const json = await res2.json();
      expect(json.error).toMatch(/already.*approved/i);
    });
  });

  describe("5. Report Card PDF Password Protection & Generation", () => {
    let examId: string;
    let studentId: string;

    beforeAll(async () => {
      examId = `exam_rc_${suffix}`;
      studentId = `stud_rc_${suffix}`;

      await db.insert(exams).values({
        id: examId,
        institutionId: instId,
        title: `Final Term ${suffix}`,
        academicYear: "2026-2027",
        term: "Annual",
        startDate: "2026-11-01",
        endDate: "2026-11-30",
        status: "published", // Published allows preview
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.insert(students).values({
        id: studentId,
        institutionId: instId,
        admissionNo: `ADM-RC-${suffix}`,
        firstName: "Anjali",
        lastName: `Nair-${suffix}`,
        dateOfBirth: "2005-04-12", // DDMMYYYY -> 12042005
        isActive: true,
      });
    });

    it("generates encrypted report card PDF successfully", async () => {
      const req = makeReq(
        `http://localhost/api/examinations/report-cards?examId=${examId}&studentId=${studentId}&encrypt=true`,
        undefined,
        "GET"
      );

      const res = await getReportCard(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      const text = await res.text();
      expect(text.length).toBeGreaterThan(100);
    });

    it("generates unencrypted report card PDF when encrypt flag is omitted", async () => {
      const req = makeReq(
        `http://localhost/api/examinations/report-cards?examId=${examId}&studentId=${studentId}`,
        undefined,
        "GET"
      );

      const res = await getReportCard(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      const text = await res.text();
      expect(text.length).toBeGreaterThan(100);
    });
  });
});
