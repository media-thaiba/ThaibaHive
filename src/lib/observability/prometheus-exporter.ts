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

  return lines.join("\n") + "\n";
}

function escapeLabelValue(val: string): string {
  return val.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
