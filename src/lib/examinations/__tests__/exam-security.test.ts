import { POST as createExam } from "@/app/api/examinations/exams/route";
import { POST as publishReportCards } from "@/app/api/examinations/report-cards/publish/route";
import { verifySession, hasPermission } from "@thaiba/auth";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
    resolveInstitutionScopeForSession: jest.fn().mockResolvedValue("inst_campus_main"),
    resolveScopedInstitutionId: jest.fn().mockResolvedValue("inst_campus_main"),
  };
});


jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => {
          const res = Promise.resolve([{ id: "exam_100", status: "evaluation" }]) as Promise<unknown> & { get: jest.Mock };
          res.get = jest.fn().mockResolvedValue({ id: "exam_100", status: "evaluation" });
          return res;
        }),
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn().mockResolvedValue(true),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => {
          const res = Promise.resolve([{ id: "exam_100", status: "published" }]) as Promise<unknown> & { returning: jest.Mock };
          res.returning = jest.fn().mockResolvedValue([{ id: "exam_100", status: "published" }]);
          return res;
        }),
      })),
    })),
  },
}));

describe("Examination RBAC & Security Audit Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 Unauthorized for unauthenticated requests", async () => {
    (verifySession as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost/api/examinations/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test Exam" }),
    });

    const res = await createExam(req);
    expect(res.status).toBe(401);
  });

  it("should return 403 Forbidden if user lacks required permission", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "staff_01",
      role: "staff",
    });
    (hasPermission as jest.Mock).mockReturnValue(false); // Permission denied

    const req = new Request("http://localhost/api/examinations/report-cards/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId: "exam_100" }),
    });

    const res = await publishReportCards(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Forbidden");
  });

  it("should allow request if user has valid session and permission", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      sid: "sess_admin",
      staffId: "admin_01",
      role: "admin",
      institutionId: "inst_campus_main",
    });
    (hasPermission as jest.Mock).mockReturnValue(true);

    const req = new Request("http://localhost/api/examinations/report-cards/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId: "exam_100" }),
    });

    const res = await publishReportCards(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("published");
  });
});
