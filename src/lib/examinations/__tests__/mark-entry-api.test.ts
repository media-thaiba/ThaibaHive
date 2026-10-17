import { GET as getMarks } from "@/app/api/examinations/marks/route";
import { POST as batchMarks } from "@/app/api/examinations/marks/batch/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn().mockResolvedValue({
      staffId: "staff_teacher_01",
      role: "staff",
      institutionId: "inst_campus_main",
    }),
    resolveInstitutionScopeForSession: jest.fn().mockResolvedValue("inst_campus_main"),
    getUserInstitutionScope: jest.fn().mockResolvedValue("inst_campus_main"),
    resolveScopedInstitutionId: jest.fn().mockResolvedValue("inst_campus_main"),
    getStaffInstitutionMemberships: jest.fn().mockResolvedValue(["inst_campus_main"]),
    hasPermission: jest.fn(() => true),
  };
});

jest.mock("@/db", () => {
  const mockMark = {
    id: "mark_101",
    examScheduleId: "sched_math_1",
    studentId: "stud_01",
    marksObtained: 85,
    maxMarks: 100,
    isAbsent: false,
    evaluatorToken: "EVAL-A1B2C3D4",
    doubleBlind: true,
    status: "submitted",
    updatedAt: new Date().toISOString(),
  };

  // Returned for every .where().get(): serves as the schedule lookup, the parent
  // exam lookup (institutionId + status feed the new tenant/terminal guards),
  // and the per-student existing-mark lookup. The out-of-bound mark check fires
  // before any update, so a single shape is sufficient.
  const mockSchedule = {
    id: "sched_math_1",
    examId: "exam_100",
    maxMarks: 100,
    institutionId: "inst_campus_main",
    status: "ongoing",
  };

  return {
    db: {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          leftJoin: jest.fn(() => ({
            where: jest.fn().mockResolvedValue([mockMark]),
          })),
          where: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(mockSchedule),
            all: jest.fn().mockResolvedValue([{ id: "stud_01" }]),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        values: jest.fn().mockResolvedValue(true),
      })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue(true),
        })),
      })),
    },
  };
});

describe("Mark Entry & Moderation API Routes", () => {
  it("GET /api/examinations/marks should require examScheduleId", async () => {
    const req = new Request("http://localhost/api/examinations/marks");
    const res = await getMarks(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/examinations/marks/batch should validate out-of-bound marks", async () => {
    const req = new Request("http://localhost/api/examinations/marks/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examScheduleId: "sched_math_1",
        doubleBlind: true,
        entries: [{ studentId: "stud_01", marksObtained: 150 }], // 150 > maxMarks (100)
      }),
    });

    const res = await batchMarks(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid mark");
  });
});
