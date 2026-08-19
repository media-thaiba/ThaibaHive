import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { DatabaseIndexTuner } from "@/lib/resilience/database-index-tuner";
import { QueryMetricsCollector } from "@/lib/resilience/query-metrics-collector";

const globalMetricsCollector = new QueryMetricsCollector();
const globalIndexTuner = new DatabaseIndexTuner(globalMetricsCollector);

export const GET = requireAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") || "tenant-main";

    const recommendations = globalIndexTuner.getRecommendations(tenantId);
    const metrics = globalMetricsCollector.getAggregatedMetrics(tenantId);

    return NextResponse.json({ recommendations, metrics }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch index tuning metrics" },
      { status: 500 }
    );
  }
}, "resilience:manage");

export const POST = requireAuth(async (request: Request) => {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
  }

  const { action, recommendationId, tenantId = "tenant-main" } = body;

  if (action === "analyze") {
    const recs = globalIndexTuner.analyzeAndRecommend(tenantId);
    return NextResponse.json({ message: "Analysis complete", recommendations: recs }, { status: 200 });
  }

  if (action === "apply" && recommendationId) {
    const result = globalIndexTuner.applyRecommendation(recommendationId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  }

  return NextResponse.json({ error: "Invalid action or missing recommendationId" }, { status: 400 });
}, "resilience:manage");
