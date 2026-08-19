
import { DwEtlService, ensureRegionalTablesExist } from "../dw-etl-service";
import { db } from "@/db";
import { dwAggregatedAnalytics, dwEtlRuns, regionalGroups } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("REG-003: Enterprise Data Warehouse ETL Pipeline", () => {
  it("runs incremental ETL pipeline and produces aggregated snapshots within < 5s SLA", async () => {
    await ensureRegionalTablesExist();

    const groupId = `rg_test_${Date.now()}`;

    // Setup mock regional group
    await db.insert(regionalGroups).values({
      id: groupId,
      name: "Test Southern Region",
      code: `TRG_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).run();

    const startTime = Date.now();
    const result = await DwEtlService.runEtlPipeline({
      regionalGroupId: groupId,
      runType: "incremental",
    });

    const duration = Date.now() - startTime;

    expect(result.success).toBe(true);
    expect(result.recordsProcessed).toBeGreaterThanOrEqual(1);
    expect(duration).toBeLessThan(5000); // Meets < 5s SLA requirement

    // Verify ETL run record created in db
    const runRecord = await db
      .select()
      .from(dwEtlRuns)
      .where(eq(dwEtlRuns.id, result.runId))
      .get();

    expect(runRecord).toBeDefined();
    expect(runRecord?.status).toBe("completed");

    // Verify DW aggregation record created
    const dwRecords = await db
      .select()
      .from(dwAggregatedAnalytics)
      .where(eq(dwAggregatedAnalytics.regionalGroupId, groupId))
      .all();

    expect(dwRecords.length).toBeGreaterThanOrEqual(1);
    expect(dwRecords[0].attendanceRate).toBeGreaterThan(0);
    expect(dwRecords[0].feeRealizationRate).toBeGreaterThan(0);
  });
});
