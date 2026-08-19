import { POST as issueHallTicket } from "@/app/api/examinations/hall-tickets/route";
import { checkStudentFeeClearance } from "../hall-ticket-service";
import {  } from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn().mockResolvedValue({
    staffId: "admin_01",
    role: "admin",
    institutionId: "inst_campus_main",
  }),
  hasPermission: jest.fn(() => true),
}));

jest.mock("../hall-ticket-service", () => ({
  ...jest.requireActual("../hall-ticket-service"),
  checkStudentFeeClearance: jest.fn(),
}));

jest.mock("@/db", () => {
  const mockExam = { id: "exam_100", title: "Term Exam" };
  let getCallCount = 0;

  return {
    db: {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            get: jest.fn().mockImplementation(() => {
              getCallCount++;
              if (getCallCount % 2 === 1) {
                return Promise.resolve(mockExam);
              }
              return Promise.resolve(null);
            }),
          })),
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
