/**
 * @jest-environment node
 *
 * Examination Hardening Suite — end-to-end verification of the tenant isolation,
 * terminal-state guards, publication locks, schedule validation, and QR signature
 * integrity fixes against the real sqlite database (visitor-routes pattern).
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
import { verifySession } from "@thaiba/auth";
import { inArray, eq } from "drizzle-orm";

import { GET as getMarks } from "@/app/api/examinations/marks/route";
import { POST as postMarksBatch } from "@/app/api/examinations/marks/batch/route";
import { POST as postModerate } from "@/app/api/examinations/marks/moderate/route";
import { GET as getHallTickets, POST as postHallTicket } from "@/app/api/examinations/hall-tickets/route";
import { POST as postVerifyTicket } from "@/app/api/examinations/hall-tickets/verify/route";
import { GET as getTabulation } from "@/app/api/examinations/tabulation/route";
import { GET as getReportCard } from "@/app/api/examinations/report-cards/route";
import { POST as postPublish } from "@/app/api/examinations/report-cards/publish/route";
import { PATCH as patchExam, DELETE as deleteExam } from "@/app/api/examinations/exams/[id]/route";
import { POST as postSchedule } from "@/app/api/examinations/schedules/route";
import { generateQRPayload, verifyQRPayload } from "../hall-ticket-service";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    // Real hasPermission is kept — the publication-lock test depends on staff
    // genuinely lacking exam:publish_results.
  };
});

describe("Examination hardening — tenant isolation, terminal guards, publication locks", () => {
  const suffix = Date.now().toString();
  const instA = `inst_exa_a_${suffix}`;
  const instB = `inst_exa_b_${suffix}`;
  const staffAId = `stf_exa_staff_a_${suffix}`;
  const principalAId = `stf_exa_principal_a_${suffix}`;
  const staffBId = `stf_exa_staff_b_${suffix}`;
  const studAId = `stud_exa_a_${suffix}`;
  const studBId = `stud_exa_b_${suffix}`;
  const examOngoingId = `exam_exa_ongoing_${suffix}`;
  const examMidtermId = `exam_exa_midterm_${suffix}`;
  const examPublishedId = `exam_exa_published_${suffix}`;
  const examArchivedId = `exam_exa_archived_${suffix}`;
  const examCleanId = `exam_exa_clean_${suffix}`;
  const examConflictId = `exam_exa_conflict_${suffix}`;
  const examBId = `exam_exa_b_${suffix}`;
  const schedAId = `sched_exa_a_${suffix}`;
  const schedPubId = `sched_exa_pub_${suffix}`;
  const schedBId = `sched_exa_b_${suffix}`;
  const markAId = `mark_exa_a_${suffix}`;
  const markPubId = `mark_exa_pub_${suffix}`;
  const htAId = `ht_exa_a_${suffix}`;
  const htANumber = `HT-SEED-A-${suffix}`;
  const qrA = generateQRPayload(htANumber, studAId, examOngoingId);

  const asStaffA = () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: staffAId,
      email: `staffa_${suffix}@thaiba.edu`,
      role: "staff",
      institutionId: instA,
    });
  };
  const asPrincipalA = () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: principalAId,
      email: `principala_${suffix}@thaiba.edu`,
      role: "principal",
      institutionId: instA,
    });
  };
  const asStaffB = () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: staffBId,
      email: `staffb_${suffix}@thaiba.edu`,
      role: "staff",
      institutionId: instB,
    });
  };

  const jsonRequest = (body: unknown): Request =>
    new Request("http://localhost/api/examinations/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const getReq = (query: string): Request => new Request(`http://localhost/api/examinations/test?${query}`);

  const withParams = (id: string) => ({ params: Promise.resolve({ id }) });

  const deleteReq = () =>
    new Request("http://localhost/api/examinations/test", { method: "DELETE" });

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: instA, name: `Exam School A ${suffix}`, code: `exa${suffix.slice(-4)}a` },
      { id: instB, name: `Exam School B ${suffix}`, code: `exa${suffix.slice(-4)}b` },
    ]);
    await db.insert(staff).values([
      {
        id: staffAId,
        email: `staffa_${suffix}@thaiba.edu`,
        employeeId: `EMP-EXA-${suffix.slice(-4)}A`,
        firstName: "Staff",
        lastName: "One",
        role: "staff",
        isActive: true,
        tokenVersion: 0,
      },
      {
        id: principalAId,
        email: `principala_${suffix}@thaiba.edu`,
        employeeId: `EMP-EXA-${suffix.slice(-4)}P`,
        firstName: "Principal",
        lastName: "One",
        role: "principal",
        isActive: true,
        tokenVersion: 0,
      },
      {
        id: staffBId,
        email: `staffb_${suffix}@thaiba.edu`,
        employeeId: `EMP-EXA-${suffix.slice(-4)}B`,
        firstName: "Staff",
        lastName: "Two",
        role: "staff",
        isActive: true,
        tokenVersion: 0,
      },
    ]);
    await db.insert(staffInstitutions).values([
      { id: `si_exa_a_${suffix}`, staffId: staffAId, institutionId: instA },
      { id: `si_exa_p_${suffix}`, staffId: principalAId, institutionId: instA },
      { id: `si_exa_b_${suffix}`, staffId: staffBId, institutionId: instB },
    ]);
    await db.insert(students).values([
      {
        id: studAId,
        admissionNo: `ADA-${suffix.slice(-6)}A`,
        firstName: "Alpha",
        lastName: "Student",
        studentId: `ROLL-A-${suffix.slice(-4)}`,
        institutionId: instA,
      },
      {
        id: studBId,
        admissionNo: `ADB-${suffix.slice(-6)}B`,
        firstName: "Beta",
        lastName: "Student",
        studentId: `ROLL-B-${suffix.slice(-4)}`,
        institutionId: instB,
      },
    ]);
    await db.insert(exams).values([
      {
        id: examOngoingId,
        institutionId: instA,
        title: `Ongoing Exam ${suffix}`,
        academicYear: "2026",
        term: "1",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        status: "ongoing",
      },
      {
        id: examMidtermId,
        institutionId: instA,
        title: `Midterm Exam ${suffix}`,
        academicYear: "2026",
        term: "2",
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        status: "evaluation",
      },
      {
        id: examPublishedId,
        institutionId: instA,
        title: `Published Exam ${suffix}`,
        academicYear: "2025",
        term: "4",
        startDate: "2025-12-01",
        endDate: "2025-12-31",
        status: "published",
      },
      {
        id: examArchivedId,
        institutionId: instA,
        title: `Archived Exam ${suffix}`,
        academicYear: "2024",
        term: "4",
        startDate: "2024-12-01",
        endDate: "2024-12-31",
        status: "archived",
      },
      {
        id: examCleanId,
        institutionId: instA,
        title: `Clean Draft Exam ${suffix}`,
        academicYear: "2026",
        term: "3",
        startDate: "2026-04-01",
        endDate: "2026-04-30",
        status: "draft",
      },
      {
        id: examConflictId,
        institutionId: instA,
        title: `Conflict Draft Exam ${suffix}`,
        academicYear: "2026",
        term: "1",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        status: "draft",
      },
      {
        id: examBId,
        institutionId: instB,
        title: `Other Tenant Exam ${suffix}`,
        academicYear: "2026",
        term: "1",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        status: "ongoing",
      },
    ]);
    await db.insert(examSchedules).values([
      {
        id: schedAId,
        examId: examOngoingId,
        subjectName: "Mathematics",
        examDate: "2026-01-10",
        startTime: "09:00",
        endTime: "12:00",
        maxMarks: 100,
        passMarks: 40,
        roomNumber: "Lab-1",
      },
      {
        id: schedPubId,
        examId: examPublishedId,
        subjectName: "Science",
        examDate: "2025-12-10",
        startTime: "09:00",
        endTime: "12:00",
        maxMarks: 100,
        passMarks: 40,
        roomNumber: "Lab-2",
      },
      {
        id: schedBId,
        examId: examBId,
        subjectName: "Physics",
        examDate: "2026-01-10",
        startTime: "09:00",
        endTime: "12:00",
        maxMarks: 100,
        passMarks: 40,
        roomNumber: "Lab-9",
      },
    ]);
    await db.insert(markEntries).values([
      {
        id: markAId,
        examScheduleId: schedAId,
        studentId: studAId,
        marksObtained: 78,
        maxMarks: 100,
        status: "submitted",
        enteredByStaffId: staffAId,
      },
      {
        id: markPubId,
        examScheduleId: schedPubId,
        studentId: studAId,
        marksObtained: 85,
        maxMarks: 100,
        status: "approved",
        enteredByStaffId: staffAId,
      },
    ]);
    await db.insert(hallTickets).values([
      {
        id: htAId,
        examId: examOngoingId,
        studentId: studAId,
        ticketNumber: htANumber,
        feeCleared: true,
        qrPayload: qrA,
        status: "issued",
      },
    ]);
  });

  afterAll(async () => {
    try {
      await db.delete(markEntries).where(inArray(markEntries.id, [markAId, markPubId]));
      await db.delete(hallTickets).where(inArray(hallTickets.id, [htAId]));
      await db.delete(examSchedules).where(
        inArray(examSchedules.id, [schedAId, schedPubId, schedBId])
      );
      await db.delete(exams).where(
        inArray(exams.id, [examOngoingId, examMidtermId, examPublishedId, examArchivedId, examCleanId, examConflictId, examBId])
      );
      await db.delete(students).where(inArray(students.id, [studAId, studBId]));
      await db.delete(staffInstitutions).where(
        inArray(staffInstitutions.staffId, [staffAId, principalAId, staffBId])
      );
      await db.delete(staff).where(inArray(staff.id, [staffAId, principalAId, staffBId]));
      await db.delete(institutions).where(inArray(institutions.id, [instA, instB]));
    } catch {
      // Cleanup best-effort
    }
  });

  describe("marks GET — tenant isolation", () => {
    it("returns 404 for a staff member of another tenant", async () => {
      asStaffB();
      const res = await getMarks(getReq(`examScheduleId=${schedAId}`));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Target examination schedule not found");
    });

    it("returns the mark list for own-tenant staff", async () => {
      asStaffA();
      const res = await getMarks(getReq(`examScheduleId=${schedAId}`));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.markEntries)).toBe(true);
      expect(data.markEntries.length).toBeGreaterThan(0);
      expect(data.markEntries[0].studentId).toBe(studAId);
    });
  });

  describe("marks batch POST — tenant and terminal guards", () => {
    it("returns 404 when the schedule belongs to another tenant", async () => {
      asStaffB();
      const res = await postMarksBatch(
        jsonRequest({
          examScheduleId: schedAId,
          entries: [{ studentId: studBId, marksObtained: 50 }],
        })
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 when a submitted student belongs to another tenant", async () => {
      asStaffA();
      const res = await postMarksBatch(
        jsonRequest({
          examScheduleId: schedAId,
          entries: [{ studentId: studBId, marksObtained: 50 }],
        })
      );
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Students not found in institution scope");
    });

    it("rejects mark entry on a published examination", async () => {
      asPrincipalA();
      const res = await postMarksBatch(
        jsonRequest({
          examScheduleId: schedPubId,
          entries: [{ studentId: studAId, marksObtained: 60 }],
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("published or archived");
    });

    it("accepts mark entry for an own-tenant student on a live exam", async () => {
      asStaffA();
      const res = await postMarksBatch(
        jsonRequest({
          examScheduleId: schedAId,
          entries: [{ studentId: studAId, marksObtained: 80 }],
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.processedCount).toBe(1);
    });
  });

  describe("marks moderate POST — terminal guard", () => {
    it("rejects moderation on a published examination", async () => {
      asPrincipalA();
      const res = await postModerate(
        jsonRequest({ markEntryId: markPubId, action: "approve" })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Cannot moderate marks for a published or archived examination");
    });
  });

  describe("hall tickets — tenant isolation", () => {
    it("GET returns an empty list for another tenant's exam", async () => {
      asStaffB();
      const res = await getHallTickets(getReq(`examId=${examOngoingId}`));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.hallTickets).toEqual([]);
    });

    it("GET returns own-tenant tickets", async () => {
      asStaffA();
      const res = await getHallTickets(getReq(`examId=${examOngoingId}`));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.hallTickets.some((t: any) => t.ticketNumber === htANumber)).toBe(true);
    });

    it("POST returns 404 when the target exam belongs to another tenant", async () => {
      asPrincipalA();
      const res = await postHallTicket(
        jsonRequest({ examId: examBId, studentId: studAId })
      );
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Target examination session not found");
    });

    it("POST returns 404 when the target student belongs to another tenant", async () => {
      asPrincipalA();
      const res = await postHallTicket(
        jsonRequest({ examId: examOngoingId, studentId: studBId })
      );
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Target student not found");
    });
  });

  describe("hall ticket QR verification — tenant boundary and signature integrity", () => {
    it("rejects a scan from another tenant with the same not-found message", async () => {
      asStaffB();
      const res = await postVerifyTicket(jsonRequest({ qrPayload: qrA }));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(data.error).toBe("Hall ticket record not found in database");
    });

    it("validates an own-tenant scan of a genuine QR payload", async () => {
      asStaffA();
      const res = await postVerifyTicket(jsonRequest({ qrPayload: qrA }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.valid).toBe(true);
      expect(data.ticketNumber).toBe(htANumber);
    });

    it("rejects a tampered payload (studentId swapped) with a signature error", async () => {
      asStaffA();
      const parsed = JSON.parse(Buffer.from(qrA, "base64").toString("utf-8"));
      parsed.studentId = studBId;
      const tampered = Buffer.from(JSON.stringify(parsed)).toString("base64");
      const res = await postVerifyTicket(jsonRequest({ qrPayload: tampered }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(data.error).toContain("Signature verification failed");
    });

    it("rejects a truncated signature (length check before timingSafeEqual)", async () => {
      asStaffA();
      const parsed = JSON.parse(Buffer.from(qrA, "base64").toString("utf-8"));
      parsed.signature = String(parsed.signature).substring(0, 8);
      const truncated = Buffer.from(JSON.stringify(parsed)).toString("base64");
      const res = await postVerifyTicket(jsonRequest({ qrPayload: truncated }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(verifyQRPayload(truncated).valid).toBe(false);
    });
  });

  describe("tabulation GET — tenant isolation", () => {
    it("returns 404 for another tenant's exam", async () => {
      asStaffB();
      const res = await getTabulation(getReq(`examId=${examOngoingId}`));
      expect(res.status).toBe(404);
    });

    it("returns tabulation data for own-tenant exam", async () => {
      asStaffA();
      const res = await getTabulation(getReq(`examId=${examOngoingId}&studentId=${studAId}`));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tabulation).toBeDefined();
    });
  });

  describe("report cards — tenant isolation and publication lock", () => {
    it("returns 404 for another tenant's exam", async () => {
      asStaffB();
      const res = await getReportCard(getReq(`examId=${examOngoingId}&studentId=${studAId}`));
      expect(res.status).toBe(404);
    });

    it("returns 403 for staff previewing a pre-publication report card", async () => {
      asStaffA();
      const res = await getReportCard(getReq(`examId=${examOngoingId}&studentId=${studAId}`));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("prior to official publication");
    });

    it("returns the report card PDF once the exam is published", async () => {
      asPrincipalA();
      const res = await getReportCard(getReq(`examId=${examPublishedId}&studentId=${studAId}`));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
    });
  });

  describe("publish POST — idempotent terminal guard", () => {
    it("returns 409 when results are already published", async () => {
      asPrincipalA();
      const res = await postPublish(jsonRequest({ examId: examPublishedId }));
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe("Examination results are already published");
    });

    it("returns 400 when the exam is archived", async () => {
      asPrincipalA();
      const res = await postPublish(jsonRequest({ examId: examArchivedId }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("archived");
    });

    it("publishes once, then blocks the second publish with 409", async () => {
      asPrincipalA();
      const first = await postPublish(jsonRequest({ examId: examMidtermId }));
      expect(first.status).toBe(200);
      const second = await postPublish(jsonRequest({ examId: examMidtermId }));
      expect(second.status).toBe(409);
    });
  });

  describe("exams PATCH — published exam freeze", () => {
    it("rejects grade scale changes on a published exam", async () => {
      asPrincipalA();
      const res = await patchExam(
        jsonRequest({ gradeScaleId: `gs_${suffix}` }),
        withParams(examPublishedId)
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Cannot modify grade scale or exam dates");
    });

    it("rejects date window changes on a published exam", async () => {
      asPrincipalA();
      const res = await patchExam(
        jsonRequest({ startDate: "2025-01-01" }),
        withParams(examPublishedId)
      );
      expect(res.status).toBe(400);
    });

    it("still allows title changes on a published exam", async () => {
      asPrincipalA();
      const res = await patchExam(
        jsonRequest({ title: `Renamed Published Exam ${suffix}` }),
        withParams(examPublishedId)
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.exam.title).toBe(`Renamed Published Exam ${suffix}`);
    });
  });

  describe("exams DELETE — referential guard and tenant isolation", () => {
    it("refuses to delete an exam that has schedules", async () => {
      asPrincipalA();
      const res = await deleteExam(deleteReq(), withParams(examOngoingId));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("existing schedules or marks");
    });

    it("deletes a clean exam with no schedules or tickets", async () => {
      asPrincipalA();
      const res = await deleteExam(deleteReq(), withParams(examCleanId));
      // Clean exam has neither schedules nor tickets — delete succeeds.
      expect(res.status).toBe(200);
    });

    it("returns 404 when another tenant's exam is targeted", async () => {
      asPrincipalA();
      const res = await deleteExam(deleteReq(), withParams(examBId));
      expect(res.status).toBe(404);
    });
  });

  describe("schedules POST — time, date, terminal, and scoped room validation", () => {
    const baseSchedule = {
      subjectName: "Chemistry",
      examDate: "2026-01-12",
      startTime: "09:00",
      endTime: "11:00",
    };

    it("rejects endTime that is not after startTime", async () => {
      asPrincipalA();
      const res = await postSchedule(
        jsonRequest({ ...baseSchedule, examId: examOngoingId, startTime: "11:00", endTime: "11:00" })
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("endTime must be after startTime");
    });

    it("rejects malformed time values", async () => {
      asPrincipalA();
      const res = await postSchedule(
        jsonRequest({ ...baseSchedule, examId: examOngoingId, startTime: "9am", endTime: "11am" })
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("HH:MM");
    });

    it("rejects a schedule date outside the exam window", async () => {
      asPrincipalA();
      const res = await postSchedule(
        jsonRequest({ ...baseSchedule, examId: examOngoingId, examDate: "2026-02-05" })
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("outside the examination window");
    });

    it("rejects schedules on a published exam", async () => {
      asPrincipalA();
      const res = await postSchedule(
        jsonRequest({ ...baseSchedule, examId: examPublishedId, examDate: "2025-12-15" })
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("published or archived");
    });

    it("rejects an in-tenant room conflict (different exam, same room/time)", async () => {
      asPrincipalA();
      const res = await postSchedule(
        jsonRequest({
          ...baseSchedule,
          examId: examConflictId,
          examDate: "2026-01-10",
          startTime: "10:00",
          endTime: "13:00",
          roomNumber: "Lab-1",
        })
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("Room conflict");
    });

    it("does NOT create a phantom conflict from another tenant's identical room name", async () => {
      asPrincipalA();
      // instB has "Lab-9" booked 09:00-12:00 on 2026-01-10 — instA must be free to use it.
      const res = await postSchedule(
        jsonRequest({
          ...baseSchedule,
          examId: examOngoingId,
          examDate: "2026-01-10",
          startTime: "09:00",
          endTime: "12:00",
          roomNumber: "Lab-9",
        })
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      // Clean up the created schedule row
      await db.delete(examSchedules).where(eq(examSchedules.id, data.schedule.id));
    });

    it("creates a valid schedule for an own-tenant exam", async () => {
      asPrincipalA();
      const res = await postSchedule(
        jsonRequest({ ...baseSchedule, examId: examOngoingId, roomNumber: "Lab-3" })
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      await db.delete(examSchedules).where(eq(examSchedules.id, data.schedule.id));
    });

    it("returns 404 for another tenant's exam", async () => {
      asPrincipalA();
      const res = await postSchedule(jsonRequest({ ...baseSchedule, examId: examBId }));
      expect(res.status).toBe(404);
    });
  });
});
