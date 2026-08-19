import { EventBus } from "../observability/event-bus";

const VECTOR_MESH_OPTIMIZATION_ENABLED = process.env.VECTOR_MESH_OPTIMIZATION_ENABLED !== 'false';

export type MergeStrategy = 'eager' | 'batched' | 'priority-batched';

export interface MergeMetrics {
  batchSizes: number[];
  latenciesMs: number[];
  strategySelectionEvents: { strategy: MergeStrategy; txRatePerMin: number; timestamp: string }[];
}

const TX_PRIORITY_ORDER = ['financial', 'examination', 'academic', 'operational', 'metadata'];

/**
 * Sprint-020 VectorMeshOptimizer — adaptive batch conflict resolution for CRDT sync.
 *
 * Strategy selection based on transaction volume:
 *   eager          → < 1,000 tx/min  (process each merge immediately)
 *   batched        → 1,000–10,000    (50ms batch window, reduces per-op overhead)
 *   priority-batched → > 10,000       (50ms window, financial/examination transactions first)
 */
export class VectorMeshOptimizer {
  private metrics: MergeMetrics = { batchSizes: [], latenciesMs: [], strategySelectionEvents: [] };
  private batchWindow = 50; // ms

  /**
   * Select merge strategy based on current transaction rate.
   */
  selectStrategy(txRatePerMin: number): MergeStrategy {
    let strategy: MergeStrategy;
    if (!VECTOR_MESH_OPTIMIZATION_ENABLED || txRatePerMin < 1000) {
      strategy = 'eager';
    } else if (txRatePerMin <= 10000) {
      strategy = 'batched';
    } else {
      strategy = 'priority-batched';
    }
    this.metrics.strategySelectionEvents.push({
      strategy,
      txRatePerMin,
      timestamp: new Date().toISOString(),
    });

    try {
      const eventBus = EventBus.getInstance();
      eventBus.publishEvent({
        eventSource: "vector-mesh-optimizer",
        severity: "info",
        message: `Selected merge strategy: ${strategy} at rate: ${txRatePerMin} tx/min`,
      });
      eventBus.publishMetric({
        nodeId: "local-node",
        metricName: "txRatePerMin",
        metricValue: txRatePerMin,
      });
      eventBus.publishMetric({
        nodeId: "local-node",
        metricName: "mergeStrategy",
        metricValue: strategy === "eager" ? 1 : strategy === "batched" ? 2 : 3,
      });
    } catch (err) {
      console.error("[VectorMeshOptimizer] Telemetry error:", err);
    }

    return strategy;
  }

  /**
   * Apply priority ordering for priority-batched mode.
   * financial/examination transactions are placed first.
   */
  prioritizeTransactions<T extends { type?: string }>(transactions: T[]): T[] {
    return [...transactions].sort((a, b) => {
      const pa = TX_PRIORITY_ORDER.indexOf(a.type ?? '') ?? TX_PRIORITY_ORDER.length;
      const pb = TX_PRIORITY_ORDER.indexOf(b.type ?? '') ?? TX_PRIORITY_ORDER.length;
      return pa - pb;
    });
  }

  /**
   * Record a merge operation latency for metrics.
   */
  recordMerge(batchSize: number, latencyMs: number): void {
    this.metrics.batchSizes.push(batchSize);
    this.metrics.latenciesMs.push(latencyMs);

    try {
      const eventBus = EventBus.getInstance();
      eventBus.publishMetric({
        nodeId: "local-node",
        metricName: "mergeLatencyMs",
        metricValue: latencyMs,
      });
      eventBus.publishMetric({
        nodeId: "local-node",
        metricName: "mergeBatchSize",
        metricValue: batchSize,
      });
    } catch (err) {
      console.error("[VectorMeshOptimizer] Telemetry error:", err);
    }
  }


  /**
   * Compute latency percentiles from recorded measurements.
   */
  getMetrics(): { p50: number; p95: number; p99: number; strategyEvents: MergeMetrics['strategySelectionEvents'] } {
    const sorted = [...this.metrics.latenciesMs].sort((a, b) => a - b);
    const pct = (p: number) => {
      if (sorted.length === 0) return 0;
      const idx = Math.floor(sorted.length * p);
      return sorted[Math.min(idx, sorted.length - 1)];
    };
    return {
      p50: pct(0.5),
      p95: pct(0.95),
      p99: pct(0.99),
      strategyEvents: this.metrics.strategySelectionEvents,
    };
  }

  getBatchWindowMs(): number {
    return this.batchWindow;
  }
}