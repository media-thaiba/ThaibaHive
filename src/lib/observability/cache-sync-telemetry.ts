/**
 * Cache Sync Telemetry & Prometheus Metric Collectors
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { crossRegionCacheMesh } from "@/lib/cache/cross-region-mesh";

export interface CacheSyncMetricsSnapshot {
  meshStatus: "healthy" | "degraded" | "partitioned";
  totalRegions: number;
  healthyRegions: number;
  averageLatencyMs: number;
  totalEventsBroadcast: number;
  totalConflictsResolved: number;
}

export class CacheSyncTelemetry {
  public static getMetrics(): CacheSyncMetricsSnapshot {
    const report = crossRegionCacheMesh.getHealthReport();
    return {
      meshStatus: report.meshStatus,
      totalRegions: report.totalRegions,
      healthyRegions: report.healthyRegions,
      averageLatencyMs: report.averageLatencyMs,
      totalEventsBroadcast: report.totalEventsBroadcast,
      totalConflictsResolved: report.totalConflictsResolved,
    };
  }

  public static getPrometheusMetrics(): string {
    const m = this.getMetrics();
    const statusVal = m.meshStatus === "healthy" ? 1 : m.meshStatus === "degraded" ? 0.5 : 0;

    return [
      `# HELP thaibahive_cache_sync_mesh_status Health state of cross-region cache mesh (1=healthy, 0.5=degraded, 0=partitioned)`,
      `# TYPE thaibahive_cache_sync_mesh_status gauge`,
      `thaibahive_cache_sync_mesh_status ${statusVal}`,
      ``,
      `# HELP thaibahive_cache_sync_latency_ms Average cross-region cache sync latency in milliseconds`,
      `# TYPE thaibahive_cache_sync_latency_ms gauge`,
      `thaibahive_cache_sync_latency_ms ${m.averageLatencyMs}`,
      ``,
      `# HELP thaibahive_cache_sync_events_total Total cross-region cache invalidation events broadcast`,
      `# TYPE thaibahive_cache_sync_events_total counter`,
      `thaibahive_cache_sync_events_total ${m.totalEventsBroadcast}`,
      ``,
      `# HELP thaibahive_cache_conflicts_total Total vector clock conflicts resolved via LWW`,
      `# TYPE thaibahive_cache_conflicts_total counter`,
      `thaibahive_cache_conflicts_total ${m.totalConflictsResolved}`,
    ].join("\n");
  }
}
