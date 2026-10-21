/**
 * @jest-environment node
 *
 * Classroom & Timetable Scheduling Pipeline Perfection & Hardening Suite:
 * - Safe JSON parsing across mutating endpoints (400 on malformed payloads)
 * - Schema bounds & date/time integrity (startTime < endTime, startDate <= endDate, dayOfWeek 0..6)
 * - Anti-self-substitution enforcement (originalTeacherId !== substituteTeacherId)
 * - Conflict & duplicate prevention (409 Conflict on duplicate class, slot, instructor overlap, room conflict)
 * - Resource existence & state transitions (404 on missing records)
 */

import {
  db,
  institutions,
  staff,
  staffInstitutions,
  classes,
  academicYears,
  timetableSlots,
  timetableEntries,
  teacherSubstitutions,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import { GET as getClasses, POST as createClass } from "@/app/api/academic/classes/route";
import { GET as getClassById, PATCH as patchClassById, DELETE as deleteClassById } from "@/app/api/academic/classes/[id]/route";
import { GET as getTimetable, POST as postTimetable, DELETE as deleteTimetableEntry } from "@/app/api/academic/timetables/route";
import { GET as getSubstitutions, POST as postSubstitution, PATCH as patchSubstitution } from "@/app/api/academic/timetables/substitutions/route";
import { GET as getAcademicYears, POST as postAcademicYear } from "@/app/api/academic/academic-years/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Classroom & Timetable Scheduling Pipeline Perfection Suite", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_tt_perf_${suffix}`;
  const adminAId = `stf_tt_adm_${suffix}`;
  const teacherAId = `stf_tt_tch1_${suffix}`;
  const teacherBId = `stf_tt_tch2_${suffix}`;

  let academicYearAId: string;
  let class1Id: string;
  let class2Id: string;
  let slot1Id: string;
  let slot2Id: string;

  beforeAll(async () => {
    // Seed Institution
    await db.insert(institutions).values({
      id: instA,
      name: "Timetable Testing Institute",
      code: `TTI_${suffix}`,
    }).run();

    // Seed Admin & Teachers
    await db.insert(staff).values([
      {
        id: adminAId,
        email: `ttadmin_${suffix}@thaiba.edu`,
        employeeId: `EMP_TT_ADM_${suffix}`,
        firstName: "Timetable",
        lastName: "Coordinator",
        role: "admin",
        isActive: true,
      },
      {
        id: teacherAId,
        email: `teacher_a_${suffix}@thaiba.edu`,
        employeeId: `EMP_TCH_A_${suffix}`,
        firstName: "Teacher",
        lastName: "Alpha",
        role: "staff",
        isActive: true,
      },
      {
        id: teacherBId,
        email: `teacher_b_${suffix}@thaiba.edu`,
        employeeId: `EMP_TCH_B_${suffix}`,
        firstName: "Teacher",
        lastName: "Beta",
        role: "staff",
        isActive: true,
      },
    ]).run();

    await db.insert(staffInstitutions).values([
      { id: `si_tt_adm_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_tt_tcha_${suffix}`, staffId: teacherAId, institutionId: instA },
      { id: `si_tt_tchb_${suffix}`, staffId: teacherBId, institutionId: instA },
    ]).run();
  });

  afterAll(async () => {
    await db.delete(teacherSubstitutions).where(eq(teacherSubstitutions.institutionId, instA)).run();
    await db.delete(timetableEntries).where(eq(timetableEntries.institutionId, instA)).run();
    await db.delete(timetableSlots).where(eq(timetableSlots.institutionId, instA)).run();
    await db.delete(classes).where(eq(classes.institutionId, instA)).run();
    await db.delete(academicYears).where(eq(academicYears.institutionId, instA)).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instA)).run();
    await db.delete(staff).where(inArray(staff.id, [adminAId, teacherAId, teacherBId])).run();
    await db.delete(institutions).where(eq(institutions.id, instA)).run();
  });

  function mockSession(userId: string, role = "admin") {
    (verifySession as jest.Mock).mockResolvedValue({
      userId,
      staffId: userId,
      role,
      institutionId: instA,
      institutionIds: [instA],
      permissions: ["*"],
    });
  }

  function makeMalformedRequest(method: string, url: string) {
    return new Request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: "INVALID_MALFORMED_JSON",
    });
  }

  describe("1. Safe JSON Parsing Across All Mutating Endpoints", () => {
    beforeEach(() => mockSession(adminAId));

    test("POST /api/academic/classes returns 400 on malformed JSON payload", async () => {
      const req = makeMalformedRequest("POST", "http://localhost/api/academic/classes");
      const res = await createClass(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    test("PATCH /api/academic/classes/[id] returns 400 on malformed JSON payload", async () => {
      const req = makeMalformedRequest("PATCH", "http://localhost/api/academic/classes/cls_fake");
      const res = await patchClassById(req, { params: Promise.resolve({ id: "cls_fake" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    test("POST /api/academic/timetables returns 400 on malformed JSON payload", async () => {
      const req = makeMalformedRequest("POST", "http://localhost/api/academic/timetables");
      const res = await postTimetable(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    test("POST /api/academic/timetables/substitutions returns 400 on malformed JSON payload", async () => {
      const req = makeMalformedRequest("POST", "http://localhost/api/academic/timetables/substitutions");
      const res = await postSubstitution(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    test("PATCH /api/academic/timetables/substitutions returns 400 on malformed JSON payload", async () => {
      const req = makeMalformedRequest("PATCH", "http://localhost/api/academic/timetables/substitutions");
      const res = await patchSubstitution(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    test("POST /api/academic/academic-years returns 400 on malformed JSON payload", async () => {
      const req = makeMalformedRequest("POST", "http://localhost/api/academic/academic-years");
      const res = await postAcademicYear(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });
  });

  describe("2. Academic Years & Classes Schema Bounds & Duplicate Prevention", () => {
    beforeEach(() => mockSession(adminAId));

    test("POST /api/academic/academic-years rejects startDate > endDate", async () => {
      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `AY-${suffix}-Invalid`,
          startDate: "2026-06-01",
          endDate: "2025-05-31", // earlier than start date
          institutionId: instA,
        }),
      });
      const res = await postAcademicYear(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/endDate must be on or after startDate/i);
    });

    test("POST /api/academic/academic-years creates valid academic year", async () => {
      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `AY-${suffix}-2026-27`,
          startDate: "2026-06-01",
          endDate: "2027-05-31",
          institutionId: instA,
        }),
      });
      const res = await postAcademicYear(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.academicYear.id).toBeDefined();
      academicYearAId = data.academicYear.id;
    });

    test("POST /api/academic/academic-years rejects duplicate academic year name in same institution with 409", async () => {
      const req = new Request("http://localhost/api/academic/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `AY-${suffix}-2026-27`,
          startDate: "2026-06-01",
          endDate: "2027-05-31",
          institutionId: instA,
        }),
      });
      const res = await postAcademicYear(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/already exists/i);
    });

    test("POST /api/academic/classes creates valid class", async () => {
      const req = new Request("http://localhost/api/academic/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Grade 10",
          section: "A",
          academicYearId: academicYearAId,
          institutionId: instA,
          teacherId: teacherAId,
        }),
      });
      const res = await createClass(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.class.id).toBeDefined();
      class1Id = data.class.id;
    });

    test("POST /api/academic/classes rejects duplicate class name and section with 409 Conflict", async () => {
      const req = new Request("http://localhost/api/academic/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Grade 10",
          section: "A",
          academicYearId: academicYearAId,
          institutionId: instA,
        }),
      });
      const res = await createClass(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/already exists/i);
    });

    test("POST /api/academic/classes creates second class with different section", async () => {
      const req = new Request("http://localhost/api/academic/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Grade 10",
          section: "B",
          academicYearId: academicYearAId,
          institutionId: instA,
          teacherId: teacherBId,
        }),
      });
      const res = await createClass(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      class2Id = data.class.id;
    });

    test("PATCH /api/academic/classes/[id] rejects renaming to existing class section with 409", async () => {
      const req = new Request(`http://localhost/api/academic/classes/${class2Id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "A", // Already taken by Grade 10 Section A
        }),
      });
      const res = await patchClassById(req, { params: Promise.resolve({ id: class2Id }) });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/already exists/i);
    });

    test("GET /api/academic/classes/[id] returns 404 for non-existent class", async () => {
      const req = new Request("http://localhost/api/academic/classes/non_existent_cls");
      const res = await getClassById(req, { params: Promise.resolve({ id: "non_existent_cls" }) });
      expect(res.status).toBe(404);
    });
  });

  describe("3. Timetable Slot Creation & Time Bounds", () => {
    beforeEach(() => mockSession(adminAId));

    test("POST /api/academic/timetables (create_slot) rejects startTime >= endTime", async () => {
      const req = new Request("http://localhost/api/academic/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_slot",
          slot: {
            name: "Period 1",
            slotOrder: 1,
            startTime: "09:45",
            endTime: "09:00", // Invalid order
            institutionId: instA,
          },
        }),
      });
      const res = await postTimetable(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/endTime must be strictly after startTime/i);
    });

    test("POST /api/academic/timetables (create_slot) creates valid slot 1", async () => {
      const req = new Request("http://localhost/api/academic/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_slot",
          slot: {
            name: "Period 1",
            slotOrder: 1,
            startTime: "09:00",
            endTime: "09:45",
            institutionId: instA,
          },
        }),
      });
      const res = await postTimetable(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.slot.id).toBeDefined();
      slot1Id = data.slot.id;
    });

    test("POST /api/academic/timetables (create_slot) rejects duplicate slot order in same institution with 409", async () => {
      const req = new Request("http://localhost/api/academic/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_slot",
          slot: {
            name: "Period 1 Duplicate Order",
            slotOrder: 1,
            startTime: "09:50",
            endTime: "10:35",
            institutionId: instA,
          },
        }),
      });
      const res = await postTimetable(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/already exists/i);
    });

    test("POST /api/academic/timetables (create_slot) creates valid slot 2", async () => {
      const req = new Request("http://localhost/api/academic/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_slot",
          slot: {
            name: "Period 2",
            slotOrder: 2,
            startTime: "09:50",
            endTime: "10:35",
            institutionId: instA,
          },
        }),
      });
      const res = await postTimetable(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      slot2Id = data.slot.id;
    });
  });

  describe("4. Timetable Entries: Instructor Overlap & Room Collision Guards", () => {
    let createdEntry1Id: string;
    beforeEach(() => mockSession(adminAId));

    test("POST /api/academic/timetables rejects dayOfWeek outside 0..6", async () => {
      const req = new Request("http://localhost/api/academic/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: class1Id,
          slotId: slot1Id,
          dayOfWeek: 7, // Invalid day of week (must be 0-6)
          subjectName: "Mathematics",
          institutionId: instA,
        }),
      });
      const res = await postTimetable(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/<=6|day of week/i);
    });

    test("POST /api/academic/timetables schedules class 1 entry on Monday slot 1 with Teacher A in Room 101", async () => {
      const req = new Request("http://localhost/api/academic/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: academicYearAId,
          classId: class1Id,
          slotId: slot1Id,
          dayOfWeek: 1, // Monday
          subjectName: "Mathematics",
          teacherId: teacherAId,
          roomNumber: "Room 101",
          institutionId: instA,
        }),
      });
      const res = await postTimetable(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.entry.id).toBeDefined();
      createdEntry1Id = data.entry.id;
    });

    test("POST /api/academic/timetables detects Instructor Overlap Collision (409 Conflict) when scheduling Teacher A for Class 2 at same slot & day", async () => {
      const req = new Request("http://localhost/api/academic/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: academicYearAId,
          classId: class2Id,
          slotId: slot1Id, // Same slot
          dayOfWeek: 1, // Same Monday
          subjectName: "Physics",
          teacherId: teacherAId, // Same teacher!
          roomNumber: "Room 102",
          institutionId: instA,
        }),
      });
      const res = await postTimetable(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/Instructor is already scheduled for another class in this time slot/i);
    });

    test("POST /api/academic/timetables detects Room Occupancy Collision (409 Conflict) when booking Room 101 for Class 2 with Teacher B", async () => {
      const req = new Request("http://localhost/api/academic/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: academicYearAId,
          classId: class2Id,
          slotId: slot1Id, // Same slot
          dayOfWeek: 1, // Same Monday
          subjectName: "Physics",
          teacherId: teacherBId, // Different teacher
          roomNumber: "room 101", // Same room (case-insensitive check)
          institutionId: instA,
        }),
      });
      const res = await postTimetable(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/Room is already scheduled for another class in this time slot/i);
    });

    test("POST /api/academic/timetables successfully schedules Class 2 with Teacher B in Room 102", async () => {
      const req = new Request("http://localhost/api/academic/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: academicYearAId,
          classId: class2Id,
          slotId: slot1Id,
          dayOfWeek: 1,
          subjectName: "Physics",
          teacherId: teacherBId,
          roomNumber: "Room 102",
          institutionId: instA,
        }),
      });
      const res = await postTimetable(req);
      expect(res.status).toBe(201);
    });

    test("DELETE /api/academic/timetables returns 404 for non-existent entry", async () => {
      const req = new Request("http://localhost/api/academic/timetables?id=fake_entry_id", {
        method: "DELETE",
      });
      const res = await deleteTimetableEntry(req);
      expect(res.status).toBe(404);
    });
  });

  describe("5. Teacher Substitutions: Anti-Self-Substitution & Idempotency", () => {
    let timetableEntryAId: string;
    let substitutionAId: string;
    beforeEach(() => mockSession(adminAId));

    beforeAll(async () => {
      const entries = await db.select().from(timetableEntries).where(eq(timetableEntries.institutionId, instA)).all();
      timetableEntryAId = entries[0].id;
    });

    test("POST /api/academic/timetables/substitutions rejects self-substitution (originalTeacherId === substituteTeacherId)", async () => {
      const req = new Request("http://localhost/api/academic/timetables/substitutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instA,
          timetableEntryId: timetableEntryAId,
          date: "2026-10-25",
          originalTeacherId: teacherAId,
          substituteTeacherId: teacherAId, // Self-substitution
          reason: "Testing self-substitution guard",
        }),
      });
      const res = await postSubstitution(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Substitute teacher cannot be the same as the original teacher/i);
    });

    test("POST /api/academic/timetables/substitutions returns 404 for non-existent timetableEntryId", async () => {
      const req = new Request("http://localhost/api/academic/timetables/substitutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instA,
          timetableEntryId: "non_existent_entry_id",
          date: "2026-10-25",
          originalTeacherId: teacherAId,
          substituteTeacherId: teacherBId,
        }),
      });
      const res = await postSubstitution(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toMatch(/not found/i);
    });

    test("POST /api/academic/timetables/substitutions creates valid substitution", async () => {
      const req = new Request("http://localhost/api/academic/timetables/substitutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instA,
          timetableEntryId: timetableEntryAId,
          date: "2026-10-25",
          originalTeacherId: teacherAId,
          substituteTeacherId: teacherBId,
          reason: "Medical leave",
        }),
      });
      const res = await postSubstitution(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.substitution.id).toBeDefined();
      expect(data.substitution.status).toBe("assigned");
      substitutionAId = data.substitution.id;
    });

    test("POST /api/academic/timetables/substitutions rejects duplicate substitution for same entry and date with 409", async () => {
      const req = new Request("http://localhost/api/academic/timetables/substitutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instA,
          timetableEntryId: timetableEntryAId,
          date: "2026-10-25",
          originalTeacherId: teacherAId,
          substituteTeacherId: teacherBId,
          reason: "Duplicate attempt",
        }),
      });
      const res = await postSubstitution(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/already exists/i);
    });

    test("PATCH /api/academic/timetables/substitutions updates status to completed", async () => {
      const req = new Request("http://localhost/api/academic/timetables/substitutions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: substitutionAId,
          status: "completed",
        }),
      });
      const res = await patchSubstitution(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.substitution.status).toBe("completed");
    });

    test("PATCH /api/academic/timetables/substitutions returns 404 for non-existent substitution id", async () => {
      const req = new Request("http://localhost/api/academic/timetables/substitutions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "sub_fake_id",
          status: "cancelled",
        }),
      });
      const res = await patchSubstitution(req);
      expect(res.status).toBe(404);
    });
  });

  describe("6. Class Deletion Lifecycle", () => {
    beforeEach(() => mockSession(adminAId));

    test("DELETE /api/academic/classes/[id] soft deletes class (isActive = false)", async () => {
      const req = new Request(`http://localhost/api/academic/classes/${class2Id}`, {
        method: "DELETE",
      });
      const res = await deleteClassById(req, { params: Promise.resolve({ id: class2Id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const row = await db.select().from(classes).where(eq(classes.id, class2Id)).get();
      expect(row?.isActive).toBe(false);
    });

    test("DELETE /api/academic/classes/[id] returns 404 for non-existent class", async () => {
      const req = new Request("http://localhost/api/academic/classes/cls_non_existent", {
        method: "DELETE",
      });
      const res = await deleteClassById(req, { params: Promise.resolve({ id: "cls_non_existent" }) });
      expect(res.status).toBe(404);
    });
  });
});
