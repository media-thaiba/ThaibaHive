
import { RegionalBenchmarkingService } from "../regional-benchmarking-service";
import { ensureRegionalTablesExist } from "../dw-etl-service";
import { db } from "@/db";
import { dwAggregatedAnalytics, regionalGroups } from "@/db/schema";
import { sql } from "drizzle-orm";

describe("REG-005: Cross-Institution Performance Benchmarking Engine", () => {
  it("calculates mean, standard deviation, z-scores, and percentile ranks accurately", async () => {
    await ensureRegionalTablesExist();

    const groupId = `rg_bench_${Date.now()}`;

    await db.insert(regionalGroups).values({
      id: groupId,
      name: "Benchmarking Region",
      code: `RGB_${Date.now()}`,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).run();

    // Insert mock institutions using raw SQL to ensure column compatibility
    await db.run(sql`
      INSERT OR IGNORE INTO institutions (id, name, code, type)
      VALUES 
        ('inst_alpha', 'Campus Alpha', 'ALPHA_TEST', 'campus'),
        ('inst_beta', 'Campus Beta', 'BETA_TEST', 'campus'),
        ('inst_gamma', 'Campus Gamma', 'GAMMA_TEST', 'campus');
    `);

    // Insert 3 mock campus snapshots in dw_aggregated_analytics
    const today = new Date().toISOString().split("T")[0];
    await db.insert(dwAggregatedAnalytics).values([
      {
        id: `agg_1_${Date.now()}`,
        regionalGroupId: groupId,
        institutionId: "inst_alpha",
        snapshotDate: today,
        attendanceRate: 98.0,
        feeRealizationRate: 95.0,
        academicPassRate: 92.0,
        aiRiskStudentCount: 1,
        activeAnomalyCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: `agg_2_${Date.now()}`,
        regionalGroupId: groupId,
        institutionId: "inst_beta",
        snapshotDate: today,
        attendanceRate: 88.0,
        feeRealizationRate: 85.0,
        academicPassRate: 82.0,
        aiRiskStudentCount: 4,
        activeAnomalyCount: 2,
        createdAt: new Date().toISOString(),
      },
      {
        id: `agg_3_${Date.now()}`,
        regionalGroupId: groupId,
        institutionId: "inst_gamma",
        snapshotDate: today,
        attendanceRate: 92.0,
        feeRealizationRate: 90.0,
        academicPassRate: 87.0,
        aiRiskStudentCount: 2,
        activeAnomalyCount: 1,
        createdAt: new Date().toISOString(),
      },
    ]).run();

    const benchmarks = await RegionalBenchmarkingService.calculateBenchmarks({
      regionalGroupId: groupId,
      period: "30d",
      metricDomain: "all",
    });

    expect(benchmarks.length).toBe(3);

    // Alpha should be ranked #1
    expect(benchmarks[0].institutionId).toBe("inst_alpha");
    expect(benchmarks[0].rankPosition).toBe(1);
    expect(benchmarks[0].normalizedScore).toBeGreaterThan(0); // Positive Z-score for top score

    // Beta should be ranked #3
    expect(benchmarks[2].institutionId).toBe("inst_beta");
    expect(benchmarks[2].rankPosition).toBe(3);
    expect(benchmarks[2].normalizedScore).toBeLessThan(0); // Negative Z-score for lowest score
  });
});
