export interface QueryMetricRecord {
  id: string;
  tenantId: string;
  querySignature: string;
  tableTarget: string;
  executionMs: number;
  timestamp: string;
}

export interface AggregatedQueryMetric {
  querySignature: string;
  tableTarget: string;
  executionCount: number;
  avgExecutionMs: number;
  maxExecutionMs: number;
  slowQueryCount: number;
}

export class QueryMetricsCollector {
  private metrics: QueryMetricRecord[] = [];
  private slowThresholdMs: number;

  constructor(slowThresholdMs: number = 500) {
    this.slowThresholdMs = slowThresholdMs;
  }

  public recordQueryMetric(tenantId: string, querySignature: string, tableTarget: string, executionMs: number): QueryMetricRecord {
    const record: QueryMetricRecord = {
      id: `qmetric_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      querySignature,
      tableTarget,
      executionMs,
      timestamp: new Date().toISOString(),
    };

    this.metrics.push(record);
    return record;
  }

  public getAggregatedMetrics(tenantId?: string): AggregatedQueryMetric[] {
    const filtered = tenantId ? this.metrics.filter((m) => m.tenantId === tenantId) : this.metrics;
    const map = new Map<string, { tableTarget: string; totalMs: number; maxMs: number; count: number; slowCount: number }>();

    for (const item of filtered) {
      const entry = map.get(item.querySignature) || {
        tableTarget: item.tableTarget,
        totalMs: 0,
        maxMs: 0,
        count: 0,
        slowCount: 0,
      };

      entry.totalMs += item.executionMs;
      entry.count += 1;
      if (item.executionMs > entry.maxMs) entry.maxMs = item.executionMs;
      if (item.executionMs >= this.slowThresholdMs) entry.slowCount += 1;

      map.set(item.querySignature, entry);
    }

    const results: AggregatedQueryMetric[] = [];
    for (const [querySignature, data] of map.entries()) {
      results.push({
        querySignature,
        tableTarget: data.tableTarget,
        executionCount: data.count,
        avgExecutionMs: Math.round(data.totalMs / data.count),
        maxExecutionMs: data.maxMs,
        slowQueryCount: data.slowCount,
      });
    }

    return results;
  }

  public clear() {
    this.metrics = [];
  }
}
