import { ReportQueue } from "../report-queue";
import { db } from "@/db";
import { scheduledJobs, jobExecutions, institutions } from "@thaiba/db/schema";
import { ReportGeneratorService } from "../report-generator";
import { eq } from "drizzle-orm";

jest.mock("../report-generator", () => ({
  ReportGeneratorService: {
    generateReport: jest.fn(),
  },
}));

describe("ReportQueue DB-backed Queue", () => {
  beforeEach(async () => {
    // Clear jobs and executions
    await db.delete(jobExecutions).run();
    await db.delete(scheduledJobs).run();
    await db.delete(institutions).where(eq(institutions.id, "inst_test_01")).run();

    // Insert mock institution to satisfy FK constraints
    await db.insert(institutions).values({
      id: "inst_test_01",
      name: "Test Campus",
      code: "TEST_CAMPUS",
    }).run();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    jest.useRealTimers();
    // Clean up
    await db.delete(jobExecutions).run();
    await db.delete(scheduledJobs).run();
    await db.delete(institutions).where(eq(institutions.id, "inst_test_01")).run();
  });

  it("should successfully enqueue a job, write to db, and process it", async () => {
    (ReportGeneratorService.generateReport as jest.Mock).mockResolvedValue({
      filePath: "/exports/report-123.pdf",
      sizeBytes: 1024,
    });

    const jobId = await ReportQueue.addJob({
      institutionId: "inst_test_01",
      type: "attendance",
      format: "pdf",
      options: { filter: "all" },
    });

    expect(jobId).toBeDefined();

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 200));

    const status = await ReportQueue.getJobStatus(jobId);
    expect(status?.status).toBe("success");

    const execs = await db.select().from(jobExecutions).where(eq(jobExecutions.jobId, jobId)).all();
    expect(execs.length).toBe(1);
    expect(execs[0].status).toBe("success");
  });

  it("should handle job failure and retry up to 3 times with exponential backoff", async () => {
    (ReportGeneratorService.generateReport as jest.Mock).mockRejectedValue(new Error("Compile Failed"));

    jest.useFakeTimers();

    const jobId = await ReportQueue.addJob({
      institutionId: "inst_test_01",
      type: "finance",
      format: "excel",
      options: { range: "month" },
    });

    // Run first execution
    await jest.advanceTimersByTimeAsync(100);

    // Run second execution (retry after 2000ms)
    await jest.advanceTimersByTimeAsync(2000);

    // Run third execution (retry after 4000ms)
    await jest.advanceTimersByTimeAsync(4000);

    // Restore timers before DB assertions to avoid async issues
    jest.useRealTimers();

    const status = await ReportQueue.getJobStatus(jobId);
    expect(status?.status).toBe("failed");
    expect(status?.error).toBe("Compile Failed");

    const execs = await db.select().from(jobExecutions).where(eq(jobExecutions.jobId, jobId)).all();
    expect(execs.length).toBe(3);
  });
});
