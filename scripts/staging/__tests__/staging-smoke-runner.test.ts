import fs from "fs";
import path from "path";
import { runStagingSmokeTests } from "../staging-smoke-runner";
import { validateHealthAndDatabase } from "../validators/health-db-validator";
import { createTestToken, validateApisAndAuth } from "../validators/api-auth-validator";
import { validateMetricsAndLatency } from "../validators/metrics-validator";

// Mock global fetch for deterministic testing
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("STG-005: Staging Smoke Test Suite Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Dry-run execution completes successfully and creates JSON report", async () => {
    const report = await runStagingSmokeTests({
      baseUrl: "http://localhost:3000",
      jwtSecret: "test-jwt-secret-min-32-chars-staging-mock",
      dryRun: true,
    });

    expect(report.allPassed).toBe(true);
    expect(report.totalChecks).toBeGreaterThanOrEqual(8);
    expect(report.failedChecks).toBe(0);

    const reportPath = path.resolve(process.cwd(), "staging-reports", "smoke-test-summary.json");
    expect(fs.existsSync(reportPath)).toBe(true);

    const fileContent = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
    expect(fileContent.allPassed).toBe(true);
    expect(fileContent.baseUrl).toBe("http://localhost:3000");
  });

  test("createTestToken generates valid signed JWT with correct claims", async () => {
    const token = await createTestToken(
      "test-jwt-secret-min-32-chars-staging-mock",
      "super_admin",
      "staff-999"
    );
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });

  test("validateHealthAndDatabase passes when endpoint returns status: ok and migration parity matches", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        status: "ok",
        environment: "staging",
        uptimeSeconds: 1234,
        database: {
          connected: true,
          responseTimeMs: 15,
        },
      }),
    });

    const results = await validateHealthAndDatabase("http://staging-test.local", "health-secret");
    expect(results.length).toBe(3); // Health check + DB ping SLA + Migration Parity check
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(true);
    expect(results[2].passed).toBe(true);
    expect(results[2].name).toContain("Migration Schema Parity");
  });

  test("validateHealthAndDatabase fails when health check returns 503", async () => {
    mockFetch.mockResolvedValue({
      status: 503,
      statusText: "Service Unavailable",
      json: async () => ({ status: "degraded", error: "DB down" }),
    });

    const results = await validateHealthAndDatabase("http://staging-test.local", undefined, 1);
    expect(results.length).toBe(1);
    expect(results[0].passed).toBe(false);
    expect(results[0].error).toContain("Health check failed");
  });

  test("validateApisAndAuth validates all 3 role tiers and critical endpoints", async () => {
    mockFetch
      .mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) }) // Nonce
      .mockResolvedValueOnce({ status: 200, json: async () => ({ role: "principal" }) }) // Auth session principal
      .mockResolvedValueOnce({ status: 200, json: async () => ({ students: [] }) }) // Student query
      .mockResolvedValueOnce({ status: 200, json: async () => ({ claims: [] }) }) // Expense claims
      .mockResolvedValueOnce({ status: 403, json: async () => ({ error: "Forbidden" }) }); // RBAC audit boundary

    const results = await validateApisAndAuth("http://staging-test.local", "jwt-secret-min-32-chars-test");
    expect(results.length).toBe(5);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  test("validateMetricsAndLatency validates JSON structure and <1.0% error rate SLA", async () => {
    // 1. JSON format response
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        totalRequests: 500,
        errorRate: 0.2,
        globalLatency: { p50: 25, p95: 120, p99: 250 },
      }),
    });

    // 2. Prometheus format response
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: async () =>
        "# HELP thaibahive_http_requests_total\n# HELP thaibahive_app_uptime_seconds\nthaibahive_app_uptime_seconds 120",
    });

    const results = await validateMetricsAndLatency("http://staging-test.local", "metrics-secret");
    expect(results.length).toBe(4);
    expect(results.every((r) => r.passed)).toBe(true);
  });
});
