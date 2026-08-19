import { QueryMetricsCollector } from "../resilience/query-metrics-collector";
import { DatabaseIndexTuner } from "../resilience/database-index-tuner";

describe("FED-006: Automated Database Index Tuning Service Test Suite", () => {
  it("collects query metrics and calculates aggregations", () => {
    const collector = new QueryMetricsCollector(500);

    collector.recordQueryMetric("tenant-main", "SELECT * FROM students WHERE tenant_id = 't1'", "students", 650);
    collector.recordQueryMetric("tenant-main", "SELECT * FROM students WHERE tenant_id = 't1'", "students", 700);
    collector.recordQueryMetric("tenant-main", "SELECT * FROM staff WHERE id = 's1'", "staff", 50);

    const agg = collector.getAggregatedMetrics("tenant-main");
    expect(agg.length).toBe(2);

    const studentQuery = agg.find((q) => q.tableTarget === "students");
    expect(studentQuery).toBeDefined();
    expect(studentQuery?.executionCount).toBe(2);
    expect(studentQuery?.avgExecutionMs).toBe(675);
    expect(studentQuery?.slowQueryCount).toBe(2);
  });

  it("generates non-blocking DDL index recommendations for slow queries", () => {
    const collector = new QueryMetricsCollector(500);
    const tuner = new DatabaseIndexTuner(collector, 3.0);

    collector.recordQueryMetric("tenant-north", "SELECT * FROM attendance WHERE student_id = 's100'", "attendance", 850);
    collector.recordQueryMetric("tenant-north", "SELECT * FROM attendance WHERE student_id = 's100'", "attendance", 950);

    const recs = tuner.analyzeAndRecommend("tenant-north");
    expect(recs.length).toBe(1);
    expect(recs[0].tableTarget).toBe("attendance");
    expect(recs[0].recommendedIndexSql).toContain("CREATE INDEX CONCURRENTLY");
    expect(recs[0].estimatedSpeedupRatio).toBeGreaterThanOrEqual(3.0);
    expect(recs[0].status).toBe("PENDING");

    const applied = tuner.applyRecommendation(recs[0].id);
    expect(applied.success).toBe(true);
    expect(recs[0].status).toBe("APPLIED");
  });
});
