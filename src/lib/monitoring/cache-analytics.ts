import { getRawMetrics } from "./edge-analytics";

/**
 * Compiles cache statistics and hit-rate analytics.
 */
export function getCacheAnalytics(tenantId?: string): {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRatePercentage: number;
} {
  const metrics = getRawMetrics();
  const filtered = tenantId ? metrics.filter((m) => m.tenantId === tenantId) : metrics;

  const totalRequests = filtered.length;
  const cacheHits = filtered.filter((m) => m.cacheHit).length;
  const cacheMisses = totalRequests - cacheHits;
  const hitRatePercentage = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

  return {
    totalRequests,
    cacheHits,
    cacheMisses,
    hitRatePercentage: parseFloat(hitRatePercentage.toFixed(2)),
  };
}
