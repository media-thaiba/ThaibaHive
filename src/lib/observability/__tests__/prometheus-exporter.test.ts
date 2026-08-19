import { formatPrometheusMetrics } from "../prometheus-exporter";
import type { ClusterMetricsSnapshot } from "../sliding-window-aggregator";

describe("PrometheusExporter Unit Tests", () => {
  test("formats snapshot into valid OpenMetrics text", () => {
    const mockSnapshot: ClusterMetricsSnapshot = {
      window: "5m",
      timestamp: new Date().toISOString(),
      totalRequests: 15,
      totalErrors: 1,
      errorRate: 6.67,
      requestsPerMinute: 3,
      globalLatency: {
        count: 15,
        sum: 750,
        min: 10,
        max: 200,
        mean: 50,
        p50: 45,
        p90: 80,
        p95: 110,
        p99: 180,
      },
      activeRoutesCount: 1,
      routes: [
        {
          route: "/api/students",
          method: "GET",
          totalRequests: 15,
          status2xx: 14,
          status3xx: 0,
          status4xx: 0,
          status5xx: 1,
          errorRate: 6.67,
          latency: {
            count: 15,
            sum: 750,
            min: 10,
            max: 200,
            mean: 50,
            p50: 45,
            p90: 80,
            p95: 110,
            p99: 180,
          },
          lastActive: new Date().toISOString(),
        },
      ],
    };

    const output = formatPrometheusMetrics(mockSnapshot);

    expect(output).toContain("# TYPE thaibahive_http_requests_total counter");
    expect(output).toContain('thaibahive_http_requests_total{route="/api/students",method="GET",status="2xx"} 14');
    expect(output).toContain('thaibahive_http_requests_total{route="/api/students",method="GET",status="5xx"} 1');
    expect(output).toContain("# TYPE thaibahive_http_request_duration_seconds summary");
    expect(output).toContain('thaibahive_http_request_duration_seconds{route="/api/students",method="GET",quantile="0.5"} 0.0450');
    expect(output).toContain('thaibahive_http_request_duration_seconds{route="/api/students",method="GET",quantile="0.99"} 0.1800');
    expect(output).toContain("thaibahive_active_routes_count 1");
  });
});
