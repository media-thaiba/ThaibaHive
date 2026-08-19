import { QueryMetricsCollector,  } from "./query-metrics-collector";

export interface IndexRecommendation {
  id: string;
  tenantId: string;
  querySignature: string;
  tableTarget: string;
  recommendedIndexSql: string;
  estimatedSpeedupRatio: number;
  avgExecutionMs: number;
  status: "PENDING" | "APPLIED" | "REJECTED";
  createdAt: string;
}

export class DatabaseIndexTuner {
  private collector: QueryMetricsCollector;
  private recommendations: Map<string, IndexRecommendation> = new Map();
  private minSpeedupThreshold: number;

  constructor(collector?: QueryMetricsCollector, minSpeedupThreshold: number = 3.0) {
    this.collector = collector || new QueryMetricsCollector();
    this.minSpeedupThreshold = minSpeedupThreshold;
  }

  public analyzeAndRecommend(tenantId: string): IndexRecommendation[] {
    const aggregated = this.collector.getAggregatedMetrics(tenantId);
    const generated: IndexRecommendation[] = [];

    for (const metric of aggregated) {
      if (metric.avgExecutionMs >= 500 && metric.slowQueryCount >= 2) {
        const estimatedSpeedup = Math.min(10.0, Math.round((metric.avgExecutionMs / 50) * 10) / 10);

        if (estimatedSpeedup >= this.minSpeedupThreshold) {
          const columnName = this.extractColumnFromQuery(metric.querySignature) || "tenant_id";
          const indexName = `idx_${metric.tableTarget}_${columnName}_auto`;
          const recommendedIndexSql = `CREATE INDEX CONCURRENTLY ${indexName} ON ${metric.tableTarget} (${columnName});`;

          const rec: IndexRecommendation = {
            id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            tenantId,
            querySignature: metric.querySignature,
            tableTarget: metric.tableTarget,
            recommendedIndexSql,
            estimatedSpeedupRatio: estimatedSpeedup,
            avgExecutionMs: metric.avgExecutionMs,
            status: "PENDING",
            createdAt: new Date().toISOString(),
          };

          this.recommendations.set(rec.id, rec);
          generated.push(rec);
        }
      }
    }

    return generated;
  }

  public getRecommendations(tenantId?: string): IndexRecommendation[] {
    const list = Array.from(this.recommendations.values());
    if (tenantId) {
      return list.filter((r) => r.tenantId === tenantId);
    }
    return list;
  }

  public applyRecommendation(id: string): { success: boolean; sqlExecuted?: string; error?: string } {
    const rec = this.recommendations.get(id);
    if (!rec) {
      return { success: false, error: `Recommendation ${id} not found` };
    }

    rec.status = "APPLIED";
    return { success: true, sqlExecuted: rec.recommendedIndexSql };
  }

  public rejectRecommendation(id: string): boolean {
    const rec = this.recommendations.get(id);
    if (!rec) return false;
    rec.status = "REJECTED";
    return true;
  }

  private extractColumnFromQuery(querySignature: string): string | null {
    const match = querySignature.match(/WHERE\s+([a-zA-Z0-9_]+)/i);
    return match ? match[1] : null;
  }
}
