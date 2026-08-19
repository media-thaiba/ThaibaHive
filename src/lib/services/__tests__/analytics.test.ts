import { AnalyticsService } from "../analytics";
import { ReportGeneratorService } from "../report-generator";
import { requireAuth } from "@/lib/api/auth-guard";
import { verifySession } from "@thaiba/auth";
import { GET } from "@/app/api/analytics/route";

jest.mock("@thaiba/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn(() => true),
}));

// Mock the core calculation modules
jest.mock("@/lib/analytics/attendance-analytics", () => ({
  getAttendanceAnalytics: jest.fn().mockResolvedValue({
    rate: 95,
    absenteeismPeaks: [{ date: "2026-08-01", count: 5 }],
    departmentVariations: [
      { departmentName: "Science", rate: 95 },
      { departmentName: "Arts", rate: 85 }
    ]
  }),
}));

jest.mock("@/lib/analytics/finance-analytics", () => ({
  getFinancialAnalytics: jest.fn().mockResolvedValue({
    collectionTotal: 50000,
    expenseTotal: 20000,
    collectionEfficiency: 71,
    dailyCollections: [{ date: "2026-08-01", amount: 5000 }]
  }),
}));

jest.mock("@/lib/analytics/academic-analytics", () => ({
  getAcademicsAnalytics: jest.fn().mockResolvedValue({
    passRate: 88,
    classPerformance: [{ className: "Grade 10", passRate: 88, averageGpa: 3.5 }],
    subjectAverages: [{ subjectName: "Math", averageMarks: 76 }]
  }),
}));

jest.mock("@/lib/analytics/usage-analytics", () => ({
  getUsageAnalytics: jest.fn().mockResolvedValue({
    activeUsersCount: 150,
    averageLatencyMs: 45,
    personalizedWorkspaceCount: 12
  }),
}));

const mockGet = jest.fn();
const mockAll = jest.fn();
const mockRun = jest.fn();

const mockChain: Record<string, any> = {
  select: jest.fn(() => mockChain),
  from: jest.fn(() => mockChain),
  where: jest.fn(() => mockChain),
  leftJoin: jest.fn(() => mockChain),
  innerJoin: jest.fn(() => mockChain),
  orderBy: jest.fn(() => mockChain),
  limit: jest.fn(() => mockChain),
  groupBy: jest.fn(() => mockChain),
  get: mockGet,
  all: mockAll,
  run: mockRun,
};

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => mockChain),
    delete: jest.fn(() => ({
      where: jest.fn(() => ({
        run: mockRun,
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => ({
          get: mockGet,
        })),
        run: mockRun,
      })),
    })),
  },
}));

describe("Analytics Module Tests", () => {
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe("AnalyticsService aggregates calculations", () => {
    it("should aggregate student attendance rates correctly", async () => {
      mockGet.mockImplementationOnce(() => null); // Force cache miss

      const result = await AnalyticsService.getAttendance("inst_1", "2026-08-01", "2026-08-30");
      expect(result).toBeDefined();
      expect(result.rate).toBe(95);
      expect(result.departmentVariations).toHaveLength(2);
    });

    it("should aggregate finance collection rates and total ledger calculations", async () => {
      mockGet.mockImplementationOnce(() => null); // Force cache miss

      const result = await AnalyticsService.getFinance("inst_1", "2026-08-01", "2026-08-30");
      expect(result).toBeDefined();
      expect(result.collectionTotal).toBe(50000);
      expect(result.expenseTotal).toBe(20000);
      expect(result.collectionEfficiency).toBe(71);
    });

    it("should calculate exam pass rates and subject averages for academic dashboard", async () => {
      mockGet.mockImplementationOnce(() => null); // Force cache miss

      const result = await AnalyticsService.getAcademics("inst_1");
      expect(result).toBeDefined();
      expect(result.passRate).toBe(88);
      expect(result.classPerformance).toHaveLength(1);
      expect(result.subjectAverages).toHaveLength(1);
    });
  });

  describe("API Authentication & Route boundaries", () => {
    it("should return 401 if accessing analytics endpoints without valid session", async () => {
      (verifySession as jest.Mock).mockResolvedValue(null);

      const req = new Request("http://localhost/api/analytics?type=attendance");
      const res = await GET(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Not authenticated");
    });
  });

  describe("Report Generator compilation", () => {
    it("should write a valid compiled report run to public/exports", async () => {
      // Mock db queries within ReportGeneratorService
      mockAll.mockImplementation(() => []);
      mockGet.mockImplementation(() => ({ id: "1" }));

      const result = await ReportGeneratorService.generateReport("inst_1", "attendance", "pdf", {
        startDate: "2026-08-01",
        endDate: "2026-08-30",
      });

      expect(result).toBeDefined();
      expect(result.filePath).toContain("public\\exports\\");
      expect(result.webPath).toContain("/exports/");
    });
  });
});
