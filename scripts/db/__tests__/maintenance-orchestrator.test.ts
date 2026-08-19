import { runDatabaseMaintenance } from "../maintenance-orchestrator";

describe("DatabaseMaintenanceOrchestrator", () => {
  test("runs dry-run maintenance and generates report with bloat and reindex recommendations", async () => {
    const report = await runDatabaseMaintenance(true, true);
    expect(report.isCompleted).toBe(true);
    expect(report.tablesProcessed.length).toBe(3);
    expect(report.walStatus.checkpointTriggered).toBe(true);
    expect(report.reindexRecommendations.length).toBeGreaterThan(0);
    expect(report.tablesProcessed[1].bloatRatioPercent).toBe(14.7);
    expect(report.tablesProcessed[1].reindexRecommended).toBe(true);
  });

  test("executes live maintenance against active database", async () => {
    const report = await runDatabaseMaintenance(true, false);
    expect(report.isCompleted).toBe(true);
    expect(report.tablesProcessed.length).toBeGreaterThanOrEqual(5);
    expect(report.walStatus.checkpointTriggered).toBe(true);
  });
});
