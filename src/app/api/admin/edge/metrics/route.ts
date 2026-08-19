import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { getCacheAnalytics } from "@/lib/monitoring/cache-analytics";
import { getUsageSummary } from "@/lib/monitoring/usage-tracker";
import { getRawMetrics } from "@/lib/monitoring/edge-analytics";

export const GET = requireAuth(async (request, session) => {
  try {
    const url = new URL(request.url);
    const tenantParam = url.searchParams.get("tenantId") || undefined;

    const cacheStats = getCacheAnalytics(tenantParam);
    const usageSummary = getUsageSummary();
    const rawCount = getRawMetrics().length;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      rawMetricsCount: rawCount,
      cacheStats,
      usageSummary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, "edge:monitor");
