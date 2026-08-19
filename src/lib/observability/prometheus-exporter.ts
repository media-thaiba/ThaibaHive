/**
 * @module PrometheusExporter
 * Serializes APM metric snapshots into standard Prometheus OpenMetrics text format (version 0.0.4).
 */

import type { ClusterMetricsSnapshot } from "./sliding-window-aggregator";

export function formatPrometheusMetrics(snapshot: ClusterMetricsSnapshot): string {
  const lines: string[] = [];

  // 1. Process uptime and system metrics
  const uptime = typeof process !== "undefined" && process.uptime ? process.uptime() : 0;
  lines.push("# HELP thaibahive_app_uptime_seconds Process uptime in seconds.");
  lines.push("# TYPE thaibahive_app_uptime_seconds gauge");
  lines.push(`thaibahive_app_uptime_seconds ${uptime.toFixed(2)}`);

  if (typeof process !== "undefined" && process.memoryUsage) {
    const mem = process.memoryUsage();
    lines.push("# HELP thaibahive_memory_heap_used_bytes Process heap memory used in bytes.");
    lines.push("# TYPE thaibahive_memory_heap_used_bytes gauge");
    lines.push(`thaibahive_memory_heap_used_bytes ${mem.heapUsed}`);

    lines.push("# HELP thaibahive_memory_rss_bytes Process resident set size in bytes.");
    lines.push("# TYPE thaibahive_memory_rss_bytes gauge");
    lines.push(`thaibahive_memory_rss_bytes ${mem.rss}`);
  }

  // 2. Cluster active routes count
  lines.push("# HELP thaibahive_active_routes_count Number of actively tracked API routes.");
  lines.push("# TYPE thaibahive_active_routes_count gauge");
  lines.push(`thaibahive_active_routes_count ${snapshot.activeRoutesCount}`);

  // 3. HTTP requests total counter
  lines.push("# HELP thaibahive_http_requests_total Total number of HTTP requests processed by route, method, and status class.");
  lines.push("# TYPE thaibahive_http_requests_total counter");

  for (const r of snapshot.routes) {
    const cleanRoute = escapeLabelValue(r.route);
    const method = escapeLabelValue(r.method);

    if (r.status2xx > 0) {
      lines.push(`thaibahive_http_requests_total{route="${cleanRoute}",method="${method}",status="2xx"} ${r.status2xx}`);
    }
    if (r.status3xx > 0) {
      lines.push(`thaibahive_http_requests_total{route="${cleanRoute}",method="${method}",status="3xx"} ${r.status3xx}`);
    }
    if (r.status4xx > 0) {
      lines.push(`thaibahive_http_requests_total{route="${cleanRoute}",method="${method}",status="4xx"} ${r.status4xx}`);
    }
    if (r.status5xx > 0) {
      lines.push(`thaibahive_http_requests_total{route="${cleanRoute}",method="${method}",status="5xx"} ${r.status5xx}`);
    }
  }

  // 4. HTTP request duration summary / quantiles (in seconds)
  lines.push("# HELP thaibahive_http_request_duration_seconds HTTP request latency quantiles in seconds.");
  lines.push("# TYPE thaibahive_http_request_duration_seconds summary");

  for (const r of snapshot.routes) {
    const cleanRoute = escapeLabelValue(r.route);
    const method = escapeLabelValue(r.method);
    const snap = r.latency;

    // Convert milliseconds to seconds for Prometheus convention
    const p50s = (snap.p50 / 1000).toFixed(4);
    const p90s = (snap.p90 / 1000).toFixed(4);
    const p95s = (snap.p95 / 1000).toFixed(4);
    const p99s = (snap.p99 / 1000).toFixed(4);
    const sumSeconds = (snap.sum / 1000).toFixed(4);

    lines.push(`thaibahive_http_request_duration_seconds{route="${cleanRoute}",method="${method}",quantile="0.5"} ${p50s}`);
    lines.push(`thaibahive_http_request_duration_seconds{route="${cleanRoute}",method="${method}",quantile="0.9"} ${p90s}`);
    lines.push(`thaibahive_http_request_duration_seconds{route="${cleanRoute}",method="${method}",quantile="0.95"} ${p95s}`);
    lines.push(`thaibahive_http_request_duration_seconds{route="${cleanRoute}",method="${method}",quantile="0.99"} ${p99s}`);
    lines.push(`thaibahive_http_request_duration_seconds_sum{route="${cleanRoute}",method="${method}"} ${sumSeconds}`);
    lines.push(`thaibahive_http_request_duration_seconds_count{route="${cleanRoute}",method="${method}"} ${snap.count}`);
  }

  // 5. Mobile Sync Telemetry (Sprint-033 / TD-007)
  try {
    const { MobileSyncTelemetryAggregator } = require("./mobile-sync-telemetry-aggregator");
    const mobileSummary = MobileSyncTelemetryAggregator.getInstance().getSummary();

    lines.push("# HELP thaibahive_mobile_sync_total Total number of mobile sync batches processed.");
    lines.push("# TYPE thaibahive_mobile_sync_total counter");
    lines.push(`thaibahive_mobile_sync_total ${mobileSummary.totalBatches}`);

    lines.push("# HELP thaibahive_mobile_sync_errors_total Total number of failed mobile sync batches.");
    lines.push("# TYPE thaibahive_mobile_sync_errors_total counter");
    lines.push(`thaibahive_mobile_sync_errors_total ${mobileSummary.totalErrors}`);

    lines.push("# HELP thaibahive_mobile_sync_conflicts_total Total number of mobile sync conflict events.");
    lines.push("# TYPE thaibahive_mobile_sync_conflicts_total counter");
    lines.push(`thaibahive_mobile_sync_conflicts_total ${mobileSummary.totalConflicts}`);

    lines.push("# HELP thaibahive_mobile_sync_mutations_total Total number of mobile mutations processed.");
    lines.push("# TYPE thaibahive_mobile_sync_mutations_total counter");
    lines.push(`thaibahive_mobile_sync_mutations_total ${mobileSummary.totalMutations}`);

    const mSnap = mobileSummary.latency;
    lines.push("# HELP thaibahive_mobile_sync_duration_seconds Mobile sync latency quantiles in seconds.");
    lines.push("# TYPE thaibahive_mobile_sync_duration_seconds summary");
    lines.push(`thaibahive_mobile_sync_duration_seconds{quantile="0.5"} ${(mSnap.p50 / 1000).toFixed(4)}`);
    lines.push(`thaibahive_mobile_sync_duration_seconds{quantile="0.9"} ${(mSnap.p90 / 1000).toFixed(4)}`);
    lines.push(`thaibahive_mobile_sync_duration_seconds{quantile="0.95"} ${(mSnap.p95 / 1000).toFixed(4)}`);
    lines.push(`thaibahive_mobile_sync_duration_seconds{quantile="0.99"} ${(mSnap.p99 / 1000).toFixed(4)}`);
    lines.push(`thaibahive_mobile_sync_duration_seconds_sum ${(mSnap.sum / 1000).toFixed(4)}`);
    lines.push(`thaibahive_mobile_sync_duration_seconds_count ${mSnap.count}`);
  } catch {}

  // 6. Multi-Region Edge Cache Telemetry (Sprint-034 / EDG-004)
  try {
    const { EdgeCacheTelemetry } = require("./edge-telemetry");
    const edgeSummary = EdgeCacheTelemetry.getInstance().getSummary();

    lines.push("# HELP thaibahive_edge_cache_hits_total Total number of edge cache hits.");
    lines.push("# TYPE thaibahive_edge_cache_hits_total counter");
    lines.push(`thaibahive_edge_cache_hits_total ${edgeSummary.cacheHits}`);

    lines.push("# HELP thaibahive_edge_cache_misses_total Total number of edge cache misses.");
    lines.push("# TYPE thaibahive_edge_cache_misses_total counter");
    lines.push(`thaibahive_edge_cache_misses_total ${edgeSummary.cacheMisses}`);

    lines.push("# HELP thaibahive_edge_cache_purges_total Total number of edge purge events.");
    lines.push("# TYPE thaibahive_edge_cache_purges_total counter");
    lines.push(`thaibahive_edge_cache_purges_total ${edgeSummary.purgeEvents}`);

    lines.push("# HELP thaibahive_edge_cache_hit_ratio_percent Percentage of requests served from edge cache.");
    lines.push("# TYPE thaibahive_edge_cache_hit_ratio_percent gauge");
    lines.push(`thaibahive_edge_cache_hit_ratio_percent ${edgeSummary.hitRatioPercent}`);
  } catch {}

  // 7. Cross-Region Cache Sync Telemetry (Sprint-035 / CAC-003)
  try {
    const { CacheSyncTelemetry } = require("./cache-sync-telemetry");
    const cacheMetrics = CacheSyncTelemetry.getMetrics();
    const statusVal = cacheMetrics.meshStatus === "healthy" ? 1 : cacheMetrics.meshStatus === "degraded" ? 0.5 : 0;

    lines.push("# HELP thaibahive_cache_sync_mesh_status Health state of cross-region cache mesh (1=healthy, 0.5=degraded, 0=partitioned)");
    lines.push("# TYPE thaibahive_cache_sync_mesh_status gauge");
    lines.push(`thaibahive_cache_sync_mesh_status ${statusVal}`);

    lines.push("# HELP thaibahive_cache_sync_latency_ms Average cross-region cache sync latency in milliseconds");
    lines.push("# TYPE thaibahive_cache_sync_latency_ms gauge");
    lines.push(`thaibahive_cache_sync_latency_ms ${cacheMetrics.averageLatencyMs}`);

    lines.push("# HELP thaibahive_cache_sync_events_total Total cross-region cache invalidation events broadcast");
    lines.push("# TYPE thaibahive_cache_sync_events_total counter");
    lines.push(`thaibahive_cache_sync_events_total ${cacheMetrics.totalEventsBroadcast}`);

    lines.push("# HELP thaibahive_cache_conflicts_total Total vector clock conflicts resolved via LWW");
    lines.push("# TYPE thaibahive_cache_conflicts_total counter");
    lines.push(`thaibahive_cache_conflicts_total ${cacheMetrics.totalConflictsResolved}`);
  } catch {}

  // 8. Identity Security & DPoP Telemetry (Sprint-037 / IDP-011)
  try {
    const { getIdentityMetricsText } = require("../identity/identity-metrics");
    const idText = getIdentityMetricsText();
    if (idText) {
      lines.push(idText);
    }
  } catch {}

  // 9. Edge Revocation Mesh Telemetry (Sprint-037 / IDP-010)
  try {
    const { getRevocationMetricsText } = require("../identity/revocation-metrics");
    const revText = getRevocationMetricsText();
    if (revText) {
      lines.push(revText);
    }
  } catch {}

  return lines.join("\n") + "\n";
}

function escapeLabelValue(val: string): string {
  return val.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
