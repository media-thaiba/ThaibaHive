import { WorkspaceAggregationService } from "@/lib/services/workspace-aggregation";
import { workspacePreferenceUpdateSchema } from "@/lib/validation/schemas";
import { verifySession, hasPermission } from "@thaiba/auth";
import { db } from "@/db";

// Mock DB
jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn(),
        })),
        get: jest.fn(),
      })),
    })),
  },
  isPostgres: false,
}));

// Mock Auth
jest.mock("@thaiba/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn(),
}));

jest.mock("@thaiba/db/schema", () => ({
  workspacePreferences: {
    id: "id",
    institutionId: "institutionId",
    staffId: "staffId",
    guardianId: "guardianId",
    workspaceType: "workspaceType",
    layoutConfig: "layoutConfig",
    updatedAt: "updatedAt",
  },
  staff: {},
  staffInstitutions: {
    staffId: "staffId",
    institutionId: "institutionId",
  },
  attendanceLogs: {
    id: "id",
    staffId: "staffId",
    date: "date",
    status: "status",
  },
  tasks: {
    id: "id",
    assignedToId: "assignedToId",
    status: "status",
  },
  leaveRequests: {
    id: "id",
    staffId: "staffId",
    status: "status",
  },
  financialTransactions: {
    id: "id",
    institutionId: "institutionId",
    type: "type",
    category: "category",
    amount: "amount",
    transactionDate: "transactionDate",
  },
  studentGuardians: {
    id: "id",
    studentId: "studentId",
    guardianId: "guardianId",
  },
  students: {
    id: "id",
    firstName: "firstName",
    lastName: "lastName",
    institutionId: "institutionId",
    isActive: "isActive",
  },
  studentAttendanceLogs: {
    id: "id",
    studentId: "studentId",
    date: "date",
    status: "status",
  },
  hallTickets: {
    id: "id",
    studentId: "studentId",
    feeCleared: "feeCleared",
    createdAt: "createdAt",
  },
}));

describe("WorkspaceAggregationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPrincipalData", () => {
    it("returns correct structure with fallback values when db is empty", async () => {
      const mockSelect = db.select as jest.Mock;
      mockSelect.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(null),
          })),
          innerJoin: jest.fn(() => ({
            where: jest.fn(() => ({
              groupBy: jest.fn(() => ({
                all: jest.fn().mockResolvedValue([]),
              })),
              get: jest.fn().mockResolvedValue(null),
            })),
          })),
        })),
      });

      const result = await WorkspaceAggregationService.getPrincipalData("inst-1");
      expect(result).toEqual({
        staffTotal: 0,
        presentToday: 0,
        absentToday: 0,
        lateToday: 0,
        pendingApprovals: 0,
        incidentsPending: 0,
        feeCollectedToday: 0,
      });
    });

    it("handles db errors gracefully and returns fallback values", async () => {
      const mockSelect = db.select as jest.Mock;
      mockSelect.mockImplementation(() => {
        throw new Error("DB Connection Error");
      });

      const result = await WorkspaceAggregationService.getPrincipalData("inst-1");
      expect(result.staffTotal).toBe(0);
    });
  });

  describe("getTeacherData", () => {
    it("returns correct structure with fallback values", async () => {
      const mockSelect = db.select as jest.Mock;
      mockSelect.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(null),
          })),
        })),
      });

      const result = await WorkspaceAggregationService.getTeacherData("staff-1");
      expect(result).toEqual({
        classCount: 0,
        pendingTasks: 0,
        homeworkPendingApprovals: 0,
        attendancePending: 0,
      });
    });

    it("handles errors gracefully", async () => {
      const mockSelect = db.select as jest.Mock;
      mockSelect.mockImplementation(() => {
        throw new Error("DB Error");
      });

      const result = await WorkspaceAggregationService.getTeacherData("staff-1");
      expect(result.pendingTasks).toBe(0);
    });
  });

  describe("getCashierData", () => {
    it("returns correct structure", async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ sum: 15000 }) // collectionTotal
        .mockResolvedValueOnce({ count: 12 }) // dailyCheckouts
        .mockResolvedValueOnce({ count: 3 }) // pendingInvoices
        .mockResolvedValueOnce({ sum: 7500 }); // pendingTotal

      const mockSelect = db.select as jest.Mock;
      mockSelect.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            get: mockGet,
          })),
        })),
      });

      const result = await WorkspaceAggregationService.getCashierData("inst-1");
      expect(result).toEqual({
        collectionTotal: 15000,
        pendingInvoices: 3,
        dailyCheckouts: 12,
        pendingTotal: 7500,
      });
    });
  });

  describe("getParentData", () => {
    it("returns correct structure", async () => {
      const mockAll = jest.fn().mockResolvedValueOnce([
        { id: "student-1", firstName: "John", lastName: "Doe", institutionId: "inst-1" },
        { id: "student-2", firstName: "Jane", lastName: "Doe", institutionId: "inst-1" },
      ]);

      const mockGet = jest.fn()
        .mockResolvedValueOnce({ status: "present" }) // student-1 attendance
        .mockResolvedValueOnce({ status: "absent" }); // student-2 attendance

      const mockTicketGet = jest.fn()
        .mockResolvedValueOnce({ feeCleared: true }) // student-1 feeCleared
        .mockResolvedValueOnce({ feeCleared: false }); // student-2 feeCleared

      const mockLimit = jest.fn(() => ({
        get: mockTicketGet,
      }));

      const mockOrderBy = jest.fn(() => ({
        limit: mockLimit,
      }));

      const mockSelect = db.select as jest.Mock;
      mockSelect.mockReturnValue({
        from: jest.fn(() => ({
          innerJoin: jest.fn(() => ({
            where: jest.fn(() => ({
              all: mockAll,
            })),
          })),
          where: jest.fn(() => ({
            get: mockGet,
            orderBy: mockOrderBy,
          })),
        })),
      });

      const result = await WorkspaceAggregationService.getParentData("guardian-1");
      expect(result).toEqual({
        children: [
          { studentName: "John Doe", attendanceStatus: "present" },
          { studentName: "Jane Doe", attendanceStatus: "absent" },
        ],
        presentCount: 1,
        totalChildren: 2,
        pendingFeeTotal: 5000,
        invoiceCount: 1,
      });
    });
  });

  describe("getCacheHeaders", () => {
    it("returns Cache-Control headers with default ttl", () => {
      const headers = WorkspaceAggregationService.getCacheHeaders();
      expect(headers["Cache-Control"]).toBe("public, max-age=60, stale-while-revalidate=30");
    });

    it("returns Cache-Control headers with custom ttl", () => {
      const headers = WorkspaceAggregationService.getCacheHeaders(120);
      expect(headers["Cache-Control"]).toBe("public, max-age=120, stale-while-revalidate=60");
    });
  });
});

describe("workspacePreferenceUpdateSchema Validation", () => {
  it("passes validation with correct parameters", () => {
    const validData = {
      workspaceType: "principal",
      layoutConfig: [
        { widgetId: "principal-attendance-trends", enabled: true, order: 0 },
        { widgetId: "principal-fee-recovery", enabled: false, order: 1 },
      ],
    };
    const result = workspacePreferenceUpdateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("fails validation with invalid workspaceType", () => {
    const invalidData = {
      workspaceType: "hacker",
      layoutConfig: [{ widgetId: "some-widget", enabled: true, order: 0 }],
    };
    const result = workspacePreferenceUpdateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("fails validation with empty layoutConfig array", () => {
    const invalidData = {
      workspaceType: "teacher",
      layoutConfig: [],
    };
    const result = workspacePreferenceUpdateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("fails validation when layoutConfig exceeds 20 items", () => {
    const largeLayout = Array.from({ length: 21 }).map((_, i) => ({
      widgetId: `widget-${i}`,
      enabled: true,
      order: i,
    }));
    const invalidData = {
      workspaceType: "cashier",
      layoutConfig: largeLayout,
    };
    const result = workspacePreferenceUpdateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
