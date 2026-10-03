import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/db";
import { swarmMetrics } from "@/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";

async function handler(req: Request, session: any) {
  const url = new URL(req.url);
  const metricName = url.searchParams.get("metricName") || "mergeLatencyMs_avg_1m";
  const nodeId = url.searchParams.get("nodeId") || "local-node";
  const windowHours = parseInt(url.searchParams.get("window") || "24", 10);

  // Verify multi-tenant bounds
  const institutionId = session.institutionId;
  if (!institutionId) {
    return NextResponse.json({ error: "Unauthorized tenant" }, { status: 403 });
  }

  const now = new Date();
  const timeLimit = new Date(now.getTime() - windowHours * 60 * 60 * 1000).toISOString();

  try {
    const metrics = await db
      .select()
      .from(swarmMetrics)
      .where(
        and(
          eq(swarmMetrics.nodeId, nodeId),
          eq(swarmMetrics.metricName, metricName),
          gte(swarmMetrics.timestamp, timeLimit)
        )
      )
      .orderBy(desc(swarmMetrics.timestamp))
      .limit(100)
      .all();

    return NextResponse.json({ metrics: metrics.reverse() });
  } catch (err) {
    console.error("[Metrics API] Failed to fetch metrics:", err);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}

export const GET = requireAuth(handler, "observability:read");
