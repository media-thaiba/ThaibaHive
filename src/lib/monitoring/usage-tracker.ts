import { getRawMetrics } from "./edge-analytics";

/**
 * Summarizes usage statistics by tenant and geographic region.
 */
export function getUsageSummary(): Record<string, {
  totalRequests: number;
  rateLimitHits: number;
  byRegion: Record<string, number>;
}> {
  const metrics = getRawMetrics();
  const summary: Record<string, {
    totalRequests: number;
    rateLimitHits: number;
    byRegion: Record<string, number>;
  }> = {};

  metrics.forEach((m) => {
    if (!summary[m.tenantId]) {
      summary[m.tenantId] = {
        totalRequests: 0,
        rateLimitHits: 0,
        byRegion: {},
      };
    }

    const t = summary[m.tenantId];
    t.totalRequests += 1;
    if (m.rateLimited) {
      t.rateLimitHits += 1;
    }

    t.byRegion[m.region] = (t.byRegion[m.region] || 0) + 1;
  });

  return summary;
}
