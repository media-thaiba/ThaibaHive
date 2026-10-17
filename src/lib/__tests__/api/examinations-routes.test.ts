/**
 * @jest-environment node
 */
import {
  db,
  institutions,
  staff,
  staffInstitutions,
  students,
  exams,
  examSchedules,
  markEntries,
  hallTickets,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { inArray } from "drizzle-orm";
import { POST as createSchedule, GET as getSchedules } from "@/app/api/examinations/schedules/route";
import { POST as batchMarks } from "@/app/api/examinations/marks/batch/route";
import { POST as moderateMarks } from "@/app/api/examinations/marks/moderate/route";
import { GET as getMarks } from "@/app/api/examinations/marks/route";
import { POST as verifyTicket } from "@/app/api/examinations/hall-tickets/verify/route";
import { POST as publishExam } from "@/app/api/examinations/report-cards/publish/route";
import { GET as getReportCard } from "@/app/api/examinations/report-cards/route";
import { PATCH as updateExam, DELETE as deleteExam } from "@/app/api/examinations/exams/[id]/route";
import { generateQRPayload } from "@/lib/examinations/hall-ticket-service";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Examinations API — Tenant Isolation, Terminal Guards & Collision Integrity", () => {
  const suffix = Date.now().toString();
  const instA = `inst_exam_a_${suffix}`;
  const instACode = `exa${suffix.slice(-4)}`;
  const instB = `inst_exam_b_${suffix}`;
  const instBCode = `exb${suffix.slice(-4)}`;
  const staffAId = `stf_exam_a_${suffix}`;
  const staffBId = `stf_exam_b_${suffix}`;
  const studentAId = `stu_exam_a_${suffix}`;
  const studentBId = `stu_exam_b_${suffix}`;
  const examAId = `exam_a_${suffix}`;
  const examBId = `exam_b_${suffix}`;
  const schedAId = `sched_a_${suffix}`;

  const mockSession = (staffId: string, instId: string, role = "staff", canPublish = true) => {
    (verifySession as jest.Mock).mockResolvedValue({
      userId: staffId,
      staffId,
      email: `${staffId}@thaiba.edu`,
      role,
      institutionId: instId,
      permissions: ["*"],
    });
    (hasPermission as jest.Mock).mockImplementation((_r: string, perm: string) => {
      if (perm === "exam:publish_results") return canPublish;
      return true;
    });
  };

  const makePostRequest = (url: string, body: unknown, host = `${instACode}.thaiba.edu`): Request =>
    new Request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: host,
      },
      body: JSON.stringify(body),
    });

  const makeGetRequest = (url: string, host = `${instACode}.thaiba.edu`): Request =>
    new Request(url, {
      method: "GET",
      headers: {
        Host: host,
      },
    });

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: instA, name: `Exam School A ${suffix}`, code: instACode },
      { id: instB, name: `Exam School B ${suffix}`, code: instBCode },
    ]);

    await db.insert(staff).values([
      {
        id: staffAId,
        email: `staff_a_${suffix}@thaiba.edu`,
        employeeId: `EMP-EXA-${suffix.slice(-4)}`,
        firstName: "Examiner",
        lastName: "Alpha",
        role: "staff",
        isActive: true,
        tokenVersion: 0,
      },
      {
        id: staffBId,
        email: `staff_b_${suffix}@thaiba.edu`,
        employeeId: `EMP-EXB-${suffix.slice(-4)}`,
        firstName: "Examiner",
        lastName: "Beta",
        role: "staff",
        isActive: true,
        tokenVersion: 0,
      },
    ]);

    await db.insert(staffInstitutions).values([
      { id: `si_exa_${suffix}`, staffId: staffAId, institutionId: instA },
      { id: `si_exb_${suffix}`, staffId: staffBId, institutionId: instB },
    ]);

    await db.insert(students).values([
      {
        id: studentAId,
        institutionId: instA,
        admissionNo: `ADM-A-${suffix.slice(-4)}`,
        firstName: "Student",
        lastName: "Alpha",
        gender: "male",
        status: "active",
      },
      {
        id: studentBId,
        institutionId: instB,
        admissionNo: `ADM-B-${suffix.slice(-4)}`,
        firstName: "Student",
        lastName: "Beta",
        gender: "female",
        status: "active",
      },
    ] as any);

    await db.insert(exams).values([
      {
        id: examAId,
        institutionId: instA,
        title: `Midterm A ${suffix}`,
        academicYear: "2026-2027",
        term: "Term 1",
        startDate: "2026-11-01",
        endDate: "2026-11-15",
        status: "draft",
      },
      {
        id: examBId,
        institutionId: instB,
        title: `Midterm B ${suffix}`,
        academicYear: "2026-2027",
        term: "Term 1",
        startDate: "2026-11-01",
        endDate: "2026-11-15",
        status: "draft",
      },
    ]);

    await db.insert(examSchedules).values({
      id: schedAId,
      examId: examAId,
      subjectName: "Mathematics",
      examDate: "2026-11-05",
      startTime: "09:00",
      endTime: "12:00",
      durationMinutes: 180,
      maxMarks: 100,
      passMarks: 40,
      roomNumber: "Hall-101",
    });
  });

  afterAll(async () => {
    try {
      await db.delete(markEntries).where(inArray(markEntries.examScheduleId, [schedAId]));
      await db.delete(hallTickets).where(inArray(hallTickets.examId, [examAId, examBId]));
      await db.delete(examSchedules).where(inArray(examSchedules.id, [schedAId]));
      await db.delete(exams).where(inArray(exams.id, [examAId, examBId]));
      await db.delete(students).where(inArray(students.id, [studentAId, studentBId]));
      await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, [staffAId, staffBId]));
      await db.delete(staff).where(inArray(staff.id, [staffAId, staffBId]));
      await db.delete(institutions).where(inArray(institutions.id, [instA, instB]));
    } catch {
      // Best effort cleanup
    }
  });

  describe("Exam Schedule Collision & Bounds Integrity", () => {
    it("rejects endTime <= startTime with 400", async () => {
      mockSession(staffAId, instA);
      const res = await createSchedule(
        makePostRequest("https://thaiba.edu/api/examinations/schedules", {
          examId: examAId,
          subjectName: "Physics",
          examDate: "2026-11-06",
          startTime: "12:00",
          endTime: "10:00",
          durationMinutes: 120,
          maxMarks: 100,
          passMarks: 40,
        })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/endTime must be after startTime/i);
    });

    it("rejects schedule date outside exam window with 400", async () => {
      mockSession(staffAId, instA);
      const res = await createSchedule(
        makePostRequest("https://thaiba.edu/api/examinations/schedules", {
          examId: examAId,
          subjectName: "Physics",
          examDate: "2026-11-20", // exam window is Nov 01 to Nov 15
          startTime: "09:00",
          endTime: "12:00",
          durationMinutes: 180,
          maxMarks: 100,
          passMarks: 40,
        })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/outside the examination window/i);
    });

    it("rejects schedule creation for an exam owned by another institution with 404", async () => {
      mockSession(staffAId, instA);
      const res = await createSchedule(
        makePostRequest("https://thaiba.edu/api/examinations/schedules", {
          examId: examBId, // Belongs to instB
          subjectName: "Physics",
          examDate: "2026-11-06",
          startTime: "09:00",
          endTime: "12:00",
          durationMinutes: 180,
          maxMarks: 100,
          passMarks: 40,
        })
      );
      expect(res.status).toBe(404);
    });

    it("detects room collision for overlapping interval in same institution", async () => {
      mockSession(staffAId, instA);
      const res = await createSchedule(
        makePostRequest("https://thaiba.edu/api/examinations/schedules", {
          examId: examAId,
          subjectName: "Chemistry",
          examDate: "2026-11-05", // Same date as schedAId
          startTime: "10:00",      // Overlaps 09:00 - 12:00
          endTime: "13:00",
          roomNumber: "Hall-101",  // Same room
          durationMinutes: 180,
          maxMarks: 100,
          passMarks: 40,
        })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Room conflict: Venue Hall-101 is already scheduled/i);
    });
  });

  describe("Batch Marks Entry & Moderation Terminal Guards", () => {
    it("rejects batch mark submission for a schedule belonging to another tenant with 404", async () => {
      mockSession(staffBId, instB); // Staff from B targeting Sched in A
      const res = await batchMarks(
        makePostRequest(
          "https://thaiba.edu/api/examinations/marks/batch",
          {
            examScheduleId: schedAId,
            entries: [{ studentId: studentBId, marksObtained: 85 }],
          },
          `${instBCode}.thaiba.edu`
        )
      );
      expect(res.status).toBe(404);
    });

    it("rejects batch mark submission when studentId does not belong to caller institution", async () => {
      mockSession(staffAId, instA);
      const res = await batchMarks(
        makePostRequest("https://thaiba.edu/api/examinations/marks/batch", {
          examScheduleId: schedAId,
          entries: [{ studentId: studentBId, marksObtained: 85 }], // Student from instB
        })
      );
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/Students not found in institution scope/i);
    });

    it("rejects marks exceeding maxMarks with 400", async () => {
      mockSession(staffAId, instA);
      const res = await batchMarks(
        makePostRequest("https://thaiba.edu/api/examinations/marks/batch", {
          examScheduleId: schedAId,
          entries: [{ studentId: studentAId, marksObtained: 150 }], // maxMarks is 100
        })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Must be between 0 and max marks/i);
    });

    it("successfully records marks in draft exam", async () => {
      mockSession(staffAId, instA);
      const res = await batchMarks(
        makePostRequest("https://thaiba.edu/api/examinations/marks/batch", {
          examScheduleId: schedAId,
          entries: [{ studentId: studentAId, marksObtained: 88, remarks: "Good effort" }],
        })
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.processedCount).toBe(1);
    });

    it("rejects GET marks for a schedule belonging to another tenant with 404", async () => {
      mockSession(staffBId, instB);
      const req = makeGetRequest(
        `https://thaiba.edu/api/examinations/marks?examScheduleId=${schedAId}`,
        `${instBCode}.thaiba.edu`
      );
      const res = await getMarks(req);
      expect(res.status).toBe(404);
    });
  });

  describe("Hall Ticket Verification & Tenant Scoping", () => {
    const ticketNumber = `HT-TEST-${suffix}`;
    beforeAll(async () => {
      const qrPayload = generateQRPayload(ticketNumber, studentAId, examAId);
      await db.insert(hallTickets).values({
        id: `ht_a_${suffix}`,
        examId: examAId,
        studentId: studentAId,
        ticketNumber,
        feeCleared: true,
        qrPayload,
        status: "issued",
      });
    });

    it("rejects verification of hall ticket when scanner belongs to different institution with 404", async () => {
      mockSession(staffBId, instB);
      const qrPayload = generateQRPayload(ticketNumber, studentAId, examAId);
      const res = await verifyTicket(
        makePostRequest(
          "https://thaiba.edu/api/examinations/hall-tickets/verify",
          { qrPayload },
          `${instBCode}.thaiba.edu`
        )
      );
      expect(res.status).toBe(404);
    });

    it("successfully verifies valid hall ticket within same institution", async () => {
      mockSession(staffAId, instA);
      const qrPayload = generateQRPayload(ticketNumber, studentAId, examAId);
      const res = await verifyTicket(
        makePostRequest("https://thaiba.edu/api/examinations/hall-tickets/verify", {
          qrPayload,
        })
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.valid).toBe(true);
      expect(json.studentId).toBe(studentAId);
    });
  });

  describe("Publication & Terminal Lockout Progression", () => {
    it("rejects unprivileged staff from reading report card before exam is published with 403", async () => {
      mockSession(staffAId, instA, "staff", false); // canPublish = false
      const req = makeGetRequest(
        `https://thaiba.edu/api/examinations/report-cards?examId=${examAId}&studentId=${studentAId}`
      );
      const res = await getReportCard(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/prior to official publication/i);
    });

    it("refuses to delete exam with existing schedules with 400", async () => {
      mockSession(staffAId, instA);
      const req = new Request(`https://thaiba.edu/api/examinations/exams/${examAId}`, {
        method: "DELETE",
        headers: { Host: `${instACode}.thaiba.edu` },
      });
      const res = await deleteExam(req, { params: Promise.resolve({ id: examAId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Cannot delete an examination that has existing schedules/i);
    });

    it("publishes examination successfully", async () => {
      mockSession(staffAId, instA);
      const res = await publishExam(
        makePostRequest("https://thaiba.edu/api/examinations/report-cards/publish", {
          examId: examAId,
        })
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("published");
    });

    it("rejects re-publishing an already-published exam with 409", async () => {
      mockSession(staffAId, instA);
      const res = await publishExam(
        makePostRequest("https://thaiba.edu/api/examinations/report-cards/publish", {
          examId: examAId,
        })
      );
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/already published/i);
    });

    it("blocks entering marks after exam is published with 400", async () => {
      mockSession(staffAId, instA);
      const res = await batchMarks(
        makePostRequest("https://thaiba.edu/api/examinations/marks/batch", {
          examScheduleId: schedAId,
          entries: [{ studentId: studentAId, marksObtained: 95 }],
        })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Cannot enter marks for a published or archived examination/i);
    });

    it("blocks moderating marks after exam is published with 400", async () => {
      mockSession(staffAId, instA);
      const markEntry = await db.select().from(markEntries).where(inArray(markEntries.examScheduleId, [schedAId])).get();
      if (markEntry) {
        const res = await moderateMarks(
          makePostRequest("https://thaiba.edu/api/examinations/marks/moderate", {
            markEntryId: markEntry.id,
            action: "adjust",
            adjustedMarks: 90,
          })
        );
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/Cannot moderate marks for a published or archived examination/i);
      }
    });

    it("blocks modifying grade scale or dates on a published exam with 400", async () => {
      mockSession(staffAId, instA);
      const req = new Request(`https://thaiba.edu/api/examinations/exams/${examAId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Host: `${instACode}.thaiba.edu`,
        },
        body: JSON.stringify({ startDate: "2026-11-02" }),
      });
      const res = await updateExam(req, { params: Promise.resolve({ id: examAId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Cannot modify grade scale or exam dates on a published examination/i);
    });

    it("blocks adding new schedules to a published exam with 400", async () => {
      mockSession(staffAId, instA);
      const res = await createSchedule(
        makePostRequest("https://thaiba.edu/api/examinations/schedules", {
          examId: examAId,
          subjectName: "Biology",
          examDate: "2026-11-08",
          startTime: "09:00",
          endTime: "12:00",
          durationMinutes: 180,
          maxMarks: 100,
          passMarks: 40,
        })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Cannot add schedules to a published or archived examination/i);
    });
  });
});
