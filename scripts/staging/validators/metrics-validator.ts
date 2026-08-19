/**
 * @module MetricsValidator
 * Validates APM telemetry, latency SLA baselines, and Prometheus metrics export in staging.
 */

import type { ValidationResult } from "./health-db-validator";

export async function validateMetricsAndLatency(
  baseUrl: string,
  metricsSecret?: string,
  adminToken?: string
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // 1. JSON Telemetry Endpoint Validation
  const jsonStart = Date.now();
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (metricsSecret) {
      headers["x-metrics-secret"] = metricsSecret;
    } else if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
    }

    const res = await fetch(`${baseUrl}/api/system/metrics?window=5m`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    const dur = Date.now() - jsonStart;

    if (res.status === 200) {
      const data = await res.json();
      const hasStructure =
        typeof data.totalRequests === "number" &&
        typeof data.errorRate === "number" &&
        data.globalLatency &&
        typeof data.globalLatency.p95 === "number";

      results.push({
        suite: "APM & Latency",
        name: "Metrics Endpoint JSON Schema (/api/system/metrics)",
        passed: hasStructure,
        durationMs: dur,
        error: !hasStructure ? "Metrics response missing required telemetry fields" : undefined,
        details: {
          totalRequests: data.totalRequests,
          p95: data.globalLatency?.p95,
          errorRate: data.errorRate,
        },
      });

      // Check p95 SLA (< 500ms for staging)
      const p95 = data.globalLatency?.p95 || 0;
      const p95SlaPassed = p95 < 500;
      results.push({
        suite: "APM & Latency",
        name: "Global p95 Latency Baseline SLA (<500ms)",
        passed: p95SlaPassed,
        durationMs: p95,
        error: !p95SlaPassed ? `p95 latency ${p95}ms exceeds 500ms SLA` : undefined,
      });

      // Check Error Rate (< 1.0% SLA)
      const errRate = data.errorRate || 0;
      const errRatePassed = errRate < 1.0;
      results.push({
        suite: "APM & Latency",
        name: "System Error Rate Baseline (<1.0%)",
        passed: errRatePassed,
        durationMs: 0,
        error: !errRatePassed ? `Error rate ${errRate}% exceeds 1.0% threshold` : undefined,
      });
    } else {
      results.push({
        suite: "APM & Latency",
        name: "Metrics Endpoint JSON Schema (/api/system/metrics)",
        passed: false,
        durationMs: dur,
        error: `HTTP ${res.status}: ${res.statusText}`,
      });
    }
  } catch (err: any) {
    results.push({
      suite: "APM & Latency",
      name: "Metrics Endpoint JSON Schema",
      passed: false,
      durationMs: Date.now() - jsonStart,
      error: err?.message || String(err),
    });
  }

  // 2. Prometheus Exposition Format Validation
  const promStart = Date.now();
  try {
    const headers: Record<string, string> = {
      Accept: "text/plain",
    };
    if (metricsSecret) {
      headers["x-metrics-secret"] = metricsSecret;
    } else if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
    }

    const res = await fetch(`${baseUrl}/api/system/metrics?format=prometheus`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    const dur = Date.now() - promStart;
    if (res.status === 200) {
      const text = await res.text();
      const hasHelp = text.includes("# HELP thaibahive_http_requests_total");
      const hasUptime = text.includes("thaibahive_app_uptime_seconds");

      results.push({
        suite: "APM & Latency",
        name: "Prometheus Exposition Format (OpenMetrics)",
        passed: hasHelp && hasUptime,
        durationMs: dur,
        error: !(hasHelp && hasUptime) ? "Invalid Prometheus format or missing metric families" : undefined,
      });
    } else {
      results.push({
        suite: "APM & Latency",
        name: "Prometheus Exposition Format",
        passed: false,
        durationMs: dur,
        error: `HTTP ${res.status}: ${res.statusText}`,
      });
    }
  } catch (err: any) {
    results.push({
      suite: "APM & Latency",
      name: "Prometheus Exposition Format",
      passed: false,
      durationMs: Date.now() - promStart,
      error: err?.message || String(err),
    });
  }

  return results;
}
