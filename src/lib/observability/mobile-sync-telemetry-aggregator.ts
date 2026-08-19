/**
 * @module MobileSyncTelemetryAggregator
 * Aggregates client-reported mobile sync telemetry into production APM observability.
 */

import { LatencyHistogram, type LatencySnapshot } from "./latency-histogram";
import { SlidingWindowAggregator } from "./sliding-window-aggregator";

export interface MobileSyncEventInput {
  id: string;
  batchSize: number;
  syncDurationMs: number;
  networkType: "wifi" | "cellular" | "ethernet" | "offline" | "unknown";
  retryCount?: number;
  conflictCount?: number;
  success: boolean;
  errorCode?: string | null;
  timestamp?: string;
}

export interface MobileSyncTelemetrySummary {
  totalBatches: number;
  totalErrors: number;
  totalConflicts: number;
  totalMutations: number;
  successRate: number; // percentage
  conflictRate: number; // percentage
  latency: LatencySnapshot;
  networkDistribution: {
    wifi: number;
    cellular: number;
    ethernet: number;
    offline: number;
    unknown: number;
  };
  lastReportedAt: string | null;
}

export class MobileSyncTelemetryAggregator {
  private static instance: MobileSyncTelemetryAggregator | null = null;

  private totalBatches = 0;
  private totalErrors = 0;
  private totalConflicts = 0;
  private totalMutations = 0;
  private histogram = new LatencyHistogram();
  private networkCounts = {
    wifi: 0,
    cellular: 0,
    ethernet: 0,
    offline: 0,
    unknown: 0,
  };
  private lastReportedAt: string | null = null;

  private constructor() {}

  static getInstance(): MobileSyncTelemetryAggregator {
    if (!MobileSyncTelemetryAggregator.instance) {
      MobileSyncTelemetryAggregator.instance = new MobileSyncTelemetryAggregator();
    }
    return MobileSyncTelemetryAggregator.instance;
  }

  recordBatch(events: MobileSyncEventInput[]): void {
    if (!events || events.length === 0) return;

    for (const ev of events) {
      this.totalBatches++;
      this.totalMutations += ev.batchSize || 0;
      this.totalConflicts += ev.conflictCount || 0;
      if (!ev.success) {
        this.totalErrors++;
      }

      this.histogram.record(ev.syncDurationMs);

      const net = ev.networkType || "unknown";
      if (net in this.networkCounts) {
        this.networkCounts[net]++;
      } else {
        this.networkCounts.unknown++;
      }

      // Also pipe into the general APM SlidingWindowAggregator under '/mobile/sync'
      try {
        SlidingWindowAggregator.getInstance().recordRequest(
          "/mobile/sync",
          "POST",
          ev.success ? 200 : 500,
          ev.syncDurationMs
        );
      } catch {}
    }

    this.lastReportedAt = new Date().toISOString();
  }

  getSummary(): MobileSyncTelemetrySummary {
    const successCount = this.totalBatches - this.totalErrors;
    const successRate =
      this.totalBatches > 0
        ? Number(((successCount / this.totalBatches) * 100).toFixed(2))
        : 100.0;

    const conflictRate =
      this.totalBatches > 0
        ? Number(((this.totalConflicts / this.totalBatches) * 100).toFixed(2))
        : 0.0;

    return {
      totalBatches: this.totalBatches,
      totalErrors: this.totalErrors,
      totalConflicts: this.totalConflicts,
      totalMutations: this.totalMutations,
      successRate,
      conflictRate,
      latency: this.histogram.getSnapshot(),
      networkDistribution: { ...this.networkCounts },
      lastReportedAt: this.lastReportedAt,
    };
  }

  reset(): void {
    this.totalBatches = 0;
    this.totalErrors = 0;
    this.totalConflicts = 0;
    this.totalMutations = 0;
    this.histogram.reset();
    this.networkCounts = {
      wifi: 0,
      cellular: 0,
      ethernet: 0,
      offline: 0,
      unknown: 0,
    };
    this.lastReportedAt = null;
  }
}
