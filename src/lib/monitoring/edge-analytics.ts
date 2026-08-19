import { db } from "../../db";
import { apiUsageMetrics } from "../../db/schema";

interface MetricEntry {
  tenantId: string;
  region: string;
  endpoint: string;
  latencyMs: number;
  cacheHit: boolean;
  rateLimited: boolean;
}

const memoryMetrics: MetricEntry[] = [];

/**
 * Records performance latency, cache hits, and rate limiting occurrences at Edge nodes.
 */
export function recordEdgeMetrics(
  tenantId: string,
  region: string,
  endpoint: string,
  latencyMs: number,
  cacheHit: boolean,
  rateLimited: boolean
): void {
  memoryMetrics.push({
    tenantId,
    region,
    endpoint,
    latencyMs,
    cacheHit,
    rateLimited,
  });

  // Keep memory metrics bounded to prevent overflows
  if (memoryMetrics.length > 5000) {
    memoryMetrics.shift();
  }

  // Periodic persistence trigger simulation
  if (memoryMetrics.length % 10 === 0) {
    try {
      db.insert(apiUsageMetrics).values({
        id: `m_${Math.random().toString(36).substring(2, 9)}`,
        tenantId,
        region,
        endpointPath: endpoint,
        requestCount: 1,
        totalLatencyMs: latencyMs,
        cacheHitCount: cacheHit ? 1 : 0,
      }).catch(() => {});
    } catch {
      // Fail-silent
    }
  }
}

export function getRawMetrics(): MetricEntry[] {
  return memoryMetrics;
}

export function clearMetrics() {
  memoryMetrics.length = 0;
}
