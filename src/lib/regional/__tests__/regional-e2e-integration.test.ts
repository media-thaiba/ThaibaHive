
import { RegionalHierarchyService } from "../regional-hierarchy-service";
import { DwEtlService, ensureRegionalTablesExist } from "../dw-etl-service";
import { RegionalBenchmarkingService } from "../regional-benchmarking-service";
import { RegionalHodRankingService } from "../regional-hod-ranking-service";
import { PushNotificationService } from "@/lib/notifications/push-notification-service";
import { csvFormatter } from "@/lib/export/csv-formatter";

describe("REG-015: End-to-End Multi-Campus Integration & ETL Performance Benchmark", () => {
  it("executes complete Sprint-009 lifecycle within < 5s SLA", async () => {
    await ensureRegionalTablesExist();

    const startTime = Date.now();

    // 1. Create Regional Group
    const group = await RegionalHierarchyService.createGroup({
      name: "E2E National Educational Network",
      code: `REG_E2E_${Date.now()}`,
      description: "Full enterprise multi-campus cluster",
    });
    expect(group.id).toBeDefined();

    // 2. Assign Campus Clusters
    const cluster = await RegionalHierarchyService.assignCampusToCluster({
      regionalGroupId: group.id,
      institutionId: "inst_default",
      clusterCategory: "tier_1",
    });
    expect(cluster.regionalGroupId).toBe(group.id);

    // 3. Grant Time-Bound Access
    const grant = await RegionalHierarchyService.grantAccess({
      userId: "usr_reg_director_e2e",
      regionalGroupId: group.id,
      role: "regional_admin",
      grantedBy: "usr_super_admin",
    });
    expect(grant.role).toBe("regional_admin");

    // 4. Run DW ETL Pipeline
    const etlResult = await DwEtlService.runEtlPipeline({
      regionalGroupId: group.id,
      runType: "incremental",
    });
    expect(etlResult.success).toBe(true);
    expect(etlResult.recordsProcessed).toBeGreaterThanOrEqual(1);

    // 5. Calculate Cross-Institution Benchmarks
    const benchmarks = await RegionalBenchmarkingService.calculateBenchmarks({
      regionalGroupId: group.id,
      period: "30d",
      metricDomain: "all",
    });
    expect(benchmarks.length).toBeGreaterThanOrEqual(1);

    // 6. Calculate HOD Rankings
    const hodRankings = await RegionalHodRankingService.calculateRankings({
      regionalGroupId: group.id,
      limit: 10,
    });
    expect(hodRankings.length).toBeGreaterThanOrEqual(1);

    // 7. Dispatch High-Priority AI Risk Push Alert
    const alertResult = await PushNotificationService.dispatchAlert({
      alertId: `anom_e2e_${Date.now()}`,
      severity: "critical",
      title: "E2E Regional Anomaly Alert",
      body: "High unexcused absences detected across cluster campuses.",
      targetRegionalGroupId: group.id,
    });
    expect(alertResult.success).toBe(true);

    // 8. Generate Export Ledger
    const exportResult = csvFormatter.generate({
      type: "regional_analytics",
      format: "csv",
      title: "E2E Regional Analytics Ledger",
      columns: [
        { key: "rankPosition", header: "Rank" },
        { key: "institutionId", header: "Campus ID" },
        { key: "rawScore", header: "Raw Score" },
      ],
      data: benchmarks.map((b) => ({
        rankPosition: `#${b.rankPosition}`,
        institutionId: b.institutionId,
        rawScore: b.rawScore,
      })),
    });
    expect(exportResult.content).toBeDefined();

    const totalDuration = Date.now() - startTime;
    expect(totalDuration).toBeLessThan(5000); // Meets < 5s E2E SLA
  });
});
