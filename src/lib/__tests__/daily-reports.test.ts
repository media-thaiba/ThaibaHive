import { GET, POST } from "@/app/api/reports/route";
import { GET as getDetail } from "@/app/api/reports/[id]/route";
import { PATCH } from "@/app/api/reports/[id]/review/route";
import { verifySession, hasPermission } from "@/lib/auth";

const mockGet = jest.fn();
const mockAll = jest.fn();
const mockRun = jest.fn();

const mockChain: Record<string, any> = {
  where: jest.fn(() => mockChain),
  from: jest.fn(() => mockChain),
  select: jest.fn(() => mockChain),
  leftJoin: jest.fn(() => mockChain),
  orderBy: jest.fn(() => mockChain),
  limit: jest.fn(() => mockChain),
  get: mockGet,
  all: mockAll,
  run: mockRun,
};

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => mockChain),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => ({
          get: mockGet,
        })),
        run: mockRun,
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(() => ({
            get: mockGet,
          })),
          run: mockRun,
        })),
      })),
    })),
    delete: jest.fn(() => ({
      where: jest.fn(() => ({
        run: mockRun,
      })),
    })),
    transaction: jest.fn(async (fn: any) => {
      return fn(mockChain);
    }),
  },
  dailyReports: {
    id: "id",
    staffId: "staffId",
    date: "date",
    summary: "summary",
    status: "status",
    reviewerComment: "reviewerComment",
  },
  dailyReportTasks: {
    id: "id",
    reportId: "reportId",
    taskId: "taskId",
    description: "description",
    hoursSpent: "hoursSpent",
    status: "status",
  },
  staffDepartments: {
    staffId: "staffId",
    departmentId: "departmentId",
  },
  departments: {
    id: "id",
    headUserId: "headUserId",
  },
  tasks: {
    id: "id",
    assignedToId: "assignedToId",
  },
  auditLog: {
    id: "id",
  },
}));

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn(),
}));

describe("Daily Reports API Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (hasPermission as jest.Mock).mockReturnValue(true);
    mockGet.mockReset();
    mockAll.mockReset();
    mockRun.mockReset();
  });

  describe("GET /api/reports", () => {
    it("should allow staff to fetch their own reports", async () => {
      const session = { staffId: "staff_1", role: "staff", email: "staff@example.com" };
      (verifySession as jest.Mock).mockResolvedValue(session);
      mockAll.mockResolvedValue([{ id: "rep_1", staffId: "staff_1" }]);

      const req = new Request("http://localhost/api/reports");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.reports).toBeDefined();
    });
  });

  describe("POST /api/reports", () => {
    it("should reject report with total hours > 24", async () => {
      const session = { staffId: "staff_1", role: "staff", email: "staff@example.com" };
      (verifySession as jest.Mock).mockResolvedValue(session);

      const req = new Request("http://localhost/api/reports", {
        method: "POST",
        body: JSON.stringify({
          date: "2026-07-18",
          summary: "Day work",
          tasks: [
            { description: "Task 1", hoursSpent: 15 },
            { description: "Task 2", hoursSpent: 10 },
          ],
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Total hours for a single day cannot exceed 24.0");
    });
  });

  describe("GET /api/reports/[id]", () => {
    it("should restrict HOD from viewing team members' draft reports", async () => {
      const session = { staffId: "hod_1", role: "hod", email: "hod@example.com" };
      (verifySession as jest.Mock).mockResolvedValue(session);

      // Mock fetching report, then mock department check
      mockGet.mockResolvedValue({ id: "rep_1", staffId: "staff_2", status: "draft" });
      mockAll
        .mockResolvedValueOnce([{ id: "dept_1" }]) // departments list
        .mockResolvedValueOnce([{ staffId: "staff_2" }]); // deptStaff list

      const req = new Request("http://localhost/api/reports/rep_1");
      const res = await getDetail(req, { params: Promise.resolve({ id: "rep_1" }) });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Cannot view draft reports");
    });
  });

  describe("PATCH /api/reports/[id]/review", () => {
    it("should require reviewerComment when status is rejected", async () => {
      const session = { staffId: "hod_1", role: "hod", email: "hod@example.com" };
      (verifySession as jest.Mock).mockResolvedValue(session);
      mockGet.mockResolvedValue({ id: "rep_1", staffId: "staff_2", status: "submitted" });
      mockAll
        .mockResolvedValueOnce([{ id: "dept_1" }]) // departments list
        .mockResolvedValueOnce([{ staffId: "staff_2" }]); // deptStaff list

      const req = new Request("http://localhost/api/reports/rep_1/review", {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "rep_1" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("A comment is required when rejecting a report");
    });
  });
});
