import { POST as issueHallTicket } from "@/app/api/examinations/hall-tickets/route";
import { checkStudentFeeClearance } from "../hall-ticket-service";
jest.mock("@thaiba/auth", () => ({
  ...jest.requireActual("@thaiba/auth"),
  verifySession: jest.fn().mockResolvedValue({
    staffId: "admin_01",
    role: "admin",
    institutionId: "inst_campus_main",
  }),
  hasPermission: jest.fn(() => true),
  // Re-exported through @/lib/auth — required by the new tenant-scoped lookups.
  resolveScopedInstitutionId: jest.fn().mockResolvedValue("inst_campus_main"),
  resolveInstitutionScopeForSession: jest.fn().mockResolvedValue("inst_campus_main"),
}));

jest.mock("../hall-ticket-service", () => ({
  ...jest.requireActual("../hall-ticket-service"),
  checkStudentFeeClearance: jest.fn(),
}));

jest.mock("@/db", () => {
  const { exams, hallTickets, students } = jest.requireActual("@/db/schema");
  const mockExam = { id: "exam_100", title: "Term Exam", institutionId: "inst_campus_main", status: "ongoing" };
  const mockStudent = { id: "stud_defaulter_01", institutionId: "inst_campus_main" };

  // Table-aware routing: the hall-ticket POST issues three lookups (exam, existing
  // ticket, student) and must return the right shape for each regardless of order.
  const tableResult = (table: unknown) => {
    if (table === exams) return { get: () => Promise.resolve(mockExam) };
    if (table === hallTickets) return { get: () => Promise.resolve(null) };
    if (table === students) return { get: () => Promise.resolve(mockStudent) };
    return { get: () => Promise.resolve(null) };
  };

  return {
    db: {
      select: jest.fn(() => ({
        from: jest.fn((table: unknown) => ({
          where: jest.fn(() => tableResult(table)),
        })),
      })),
      insert: jest.fn(() => ({
        values: jest.fn().mockResolvedValue(true),
      })),
    },
  };
});

describe("Fee Clearance & Audit Trail Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should block hall ticket generation when fee balance is outstanding (> $0)", async () => {
    (checkStudentFeeClearance as jest.Mock).mockResolvedValue({
      feeCleared: false,
      pendingAmount: 450.0,
    });

    const req = new Request("http://localhost/api/examinations/hall-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId: "exam_100",
        studentId: "stud_defaulter_01",
        overrideFeeLock: false,
      }),
    });

    const res = await issueHallTicket(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.feeCleared).toBe(false);
    expect(json.pendingAmount).toBe(450.0);
  });

  it("should issue hall ticket when administrative override is granted", async () => {
    (checkStudentFeeClearance as jest.Mock).mockResolvedValue({
      feeCleared: false,
      pendingAmount: 450.0,
    });

    const req = new Request("http://localhost/api/examinations/hall-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId: "exam_100",
        studentId: "stud_defaulter_01",
        overrideFeeLock: true,
        overrideReason: "Principal written permission granted",
      }),
    });

    const res = await issueHallTicket(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.hallTicket.overrideFeeLock).toBe(true);
  });
});
