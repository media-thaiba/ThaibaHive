import { GET as getExams, POST as createExam } from "@/app/api/examinations/exams/route";
import { GET as getExamById } from "@/app/api/examinations/exams/[id]/route";

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn().mockResolvedValue({
    staffId: "staff_admin_01",
    role: "admin",
    institutionId: "inst_campus_main",
  }),
  hasPermission: jest.fn(() => true),
}));

jest.mock("@/db", () => {
  const mockExam = {
    id: "exam_test_100",
    institutionId: "inst_campus_main",
    title: "Final Term Examinations 2026",
    academicYear: "2025-2026",
    term: "Term 2",
    startDate: "2026-09-10",
    endDate: "2026-09-25",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockChain: Record<string, any> = {
    from: jest.fn(() => mockChain),
    where: jest.fn(() => mockChain),
    orderBy: jest.fn(() => mockChain),
    limit: jest.fn(() => mockChain),
    offset: jest.fn().mockResolvedValue([mockExam]),
    get: jest.fn().mockResolvedValue(mockExam),
  };

  return {
    db: {
      select: jest.fn(() => mockChain),
      insert: jest.fn(() => ({
        values: jest.fn().mockResolvedValue(true),
      })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue(true),
        })),
      })),
      delete: jest.fn(() => ({
        where: jest.fn().mockResolvedValue(true),
      })),
    },
  };
});

describe("Examination API Routes", () => {
  it("GET /api/examinations/exams should return exam list", async () => {
    const req = new Request("http://localhost/api/examinations/exams");
    const res = await getExams(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.exams).toBeDefined();
    expect(Array.isArray(json.exams)).toBe(true);
  });

  it("POST /api/examinations/exams should create new exam", async () => {
    const req = new Request("http://localhost/api/examinations/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Spring Term Exam",
        academicYear: "2025-2026",
        term: "Term 1",
        startDate: "2026-03-01",
        endDate: "2026-03-15",
      }),
    });

    const res = await createExam(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.exam.title).toBe("Spring Term Exam");
  });

  it("GET /api/examinations/exams/[id] should return target exam details", async () => {
    const req = new Request("http://localhost/api/examinations/exams/exam_test_100");
    const res = await getExamById(req, { params: Promise.resolve({ id: "exam_test_100" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.exam.id).toBe("exam_test_100");
  });
});
