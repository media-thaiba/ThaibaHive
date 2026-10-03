/**
 * Gateway Statistics API Route
 * Sprint-038 / AGS-012
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { withDPoP } from "@/lib/identity/dpop-middleware";
import { QuarantineManager } from "@/lib/security/quarantine-manager";
import { GatewayCircuitBreaker } from "@/lib/security/circuit-breaker";
import { CanaryProbeCollector } from "@/lib/security/canary-probes";
import { GatewayMetricsTracker } from "@/lib/security/gateway-metrics";

export const GET = withDPoP(
  requireAuth(async () => {
    const quarantineManager = QuarantineManager.getInstance();
    const activeQuarantines = quarantineManager.getStore().getAllActiveQuarantines();
    const breaker = GatewayCircuitBreaker.getInstance();
    const canary = CanaryProbeCollector.getInstance().getSummary();
    const metrics = GatewayMetricsTracker.getInstance().getCounters();

    const stats = {
      totalRequestsTracked: metrics.requestsTotal,
      throttledRequestsTotal: metrics.rateLimitViolationsTotal,
      activeQuarantinesCount: activeQuarantines.length,
      circuitBreakerState: breaker.getState(),
      health: {
        p50LatencyMs: canary.p50LatencyMs,
        p95LatencyMs: canary.p95LatencyMs,
        p99LatencyMs: canary.p99LatencyMs,
        errorRate: canary.errorRate,
        healthy: canary.healthy,
      },
      recentQuarantines: activeQuarantines.slice(0, 10),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(stats);
  }, "system:security:view"),
  { required: false }
);
