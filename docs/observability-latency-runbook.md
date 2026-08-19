# Operational Runbook: Production Latency Observability & APM

**Version:** 1.0 (v3.16.0)  
**Classification:** DevOps & Site Reliability Engineering (SRE) Operating Runbook  
**Applies to:** ThaibaHive Next.js Production Core  

---

## 1. APM Telemetry Architecture

ThaibaHive includes a zero-overhead, in-memory Application Performance Monitoring (APM) layer integrated into the Next.js request lifecycle:

1. **Request Interception (`src/middleware.ts` & `src/lib/middleware/apm-telemetry.ts`):**
   - High-precision monotonic timer (`performance.now()`) records start and completion timestamps.
   - Dynamic URLs are normalized into parameterized route templates (e.g. `/api/students/cm7abc` -> `/api/students/:id`) to prevent metric cardinality explosion.
   - Every outbound HTTP response receives an `x-response-time: <duration>ms` header.
2. **In-Memory Percentile Calculation (`src/lib/observability/latency-histogram.ts`):**
   - Dynamic binning combined with reservoir sampling computes exact `p50`, `p90`, `p95`, and `p99` percentiles on demand.
3. **Sliding-Window Aggregator (`src/lib/observability/sliding-window-aggregator.ts`):**
   - Maintains rolling time windows for 1m, 5m, 15m, and 1h intervals.
   - Memory bounded to <50MB with LRU eviction when active routes exceed 250.
4. **Metrics Exposition (`/api/system/metrics`):**
   - Exposes OpenMetrics / Prometheus standard text format (`Accept: text/plain` or `?format=prometheus`) and JSON telemetry snapshots.
   - Secured via `super_admin` RBAC or `METRICS_SECRET` bearer token.

---

## 2. Prometheus & Grafana Configuration

Add the following scrape configuration to your Prometheus server `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "thaibahive_app"
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: "/api/system/metrics"
    params:
      format: ["prometheus"]
      window: ["1m"]
    scheme: "https"
    static_configs:
      - targets: ["app.thaibahive.com"]
    bearer_token: "YOUR_PRODUCTION_METRICS_SECRET"
    # Or use custom header if preferred:
    # http_headers:
    #   x-metrics-secret: "YOUR_PRODUCTION_METRICS_SECRET"
```

### Key Prometheus Metrics Reference

| Metric Name | Type | Description |
| :--- | :--- | :--- |
| `thaibahive_http_requests_total` | Counter | Total HTTP requests categorized by `route`, `method`, and `status` (2xx, 3xx, 4xx, 5xx) |
| `thaibahive_http_request_duration_seconds` | Summary | Request duration quantiles (`0.5`, `0.9`, `0.95`, `0.99`) in seconds |
| `thaibahive_http_request_duration_seconds_sum` | Counter | Total accumulated latency in seconds |
| `thaibahive_http_request_duration_seconds_count` | Counter | Total sample count for route |
| `thaibahive_active_routes_count` | Gauge | Number of actively tracked API endpoints in rolling window |
| `thaibahive_app_uptime_seconds` | Gauge | Node.js process uptime |
| `thaibahive_memory_heap_used_bytes` | Gauge | Heap memory consumption in bytes |

---

## 3. SLA Alert Thresholds by Route Tier

Configure alerting rules (e.g. Prometheus Alertmanager or Datadog) based on the tier classification below:

| Tier | Endpoints / Path Patterns | Target p50 | Target p95 (SLA) | Critical Alert Threshold |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Auth & Payments** | `/api/auth/*`, `/api/finance/fees/checkout` | < 80ms | < 200ms | p95 > 500ms for 2m |
| **Tier 2: Core CRUD** | `/api/students/*`, `/api/departments/*`, `/api/attendance/*` | < 120ms | < 350ms | p95 > 750ms for 3m |
| **Tier 3: Analytics & Exports** | `/api/analytics/*`, `/api/reports/*`, `/api/examinations/tabulation` | < 400ms | < 1200ms | p95 > 2500ms for 5m |

### Example Prometheus Alert Rule

```yaml
groups:
  - name: ThaibaHivePerformanceAlerts
    rules:
      - alert: ApiHighTailLatency
        expr: thaibahive_http_request_duration_seconds{quantile="0.95"} > 0.500
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High API tail latency on {{ $labels.route }}"
          description: "p95 latency on {{ $labels.method }} {{ $labels.route }} is {{ $value }}s (> 500ms)."

      - alert: ApiHighErrorRate
        expr: (sum(rate(thaibahive_http_requests_total{status=~"5.."}[2m])) / sum(rate(thaibahive_http_requests_total[2m]))) * 100 > 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Elevated 5xx error rate"
          description: "Cluster 5xx error rate is {{ $value }}% (> 5%)."
```

---

## 4. Triage & Incident Diagnostic Workflow

When a latency spike or SLA breach alert fires:

1. **Step 1 — Admin Observability Dashboard:**
   - Log into `/admin/observability` as `super_admin`.
   - Select the `5m` or `1m` window.
   - Inspect the **Latency Summary Cards** (check if p50 vs p95 is elevated).
   - In the **Route Breakdown Table**, sort by `p95` descending to pinpoint the offending route.

2. **Step 2 — Identify Route Type & Bottleneck:**
   - **Database Contention:** If CRUD routes (e.g. `/api/students/:id`) show high p95, check database connection pool and lock states.
   - **External Third-Party API:** If routes involving payment gateways or SMS/Email providers spike, inspect downstream provider status.
   - **Client/Network Payload:** If 413 or slow uploads occur, check media proxy settings and client network bandwidth.

3. **Step 3 — Inspect Memory & Event Log:**
   - Check `thaibahive_memory_heap_used_bytes` in metrics to rule out garbage collection thrashing.
   - Inspect `/admin/audit-logs` for abnormal traffic bursts or malicious scanner activity.

---

## 5. Emergency APM Kill Switch

In the unlikely event of APM middleware anomalies or extreme resource contention, disable telemetry collection instantly without code redeployment:

```bash
# Set environment variable in production deployment
APM_TELEMETRY_ENABLED=false
```

When set to `false`, the middleware immediately bypasses all percentile calculations and metric buffer operations with zero overhead.
