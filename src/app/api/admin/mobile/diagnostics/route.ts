import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/db";
import { swarmMetrics, swarmEvents } from "@/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";

async function handler(req: Request, session: any) {
  const url = new URL(req.url);
  const windowHours = parseInt(url.searchParams.get("window") || "24", 10);

  const institutionId = session.institutionId;
  if (!institutionId) {
    return NextResponse.json({ error: "Unauthorized tenant" }, { status: 403 });
  }

  const now = new Date();
  const timeLimit = new Date(now.getTime() - windowHours * 60 * 60 * 1000).toISOString();

  try {
    // 1. Fetch metrics in the window
    const metrics = await db
      .select()
      .from(swarmMetrics)
      .where(gte(swarmMetrics.timestamp, timeLimit))
      .orderBy(desc(swarmMetrics.timestamp))
      .all();

    // 2. Fetch anomaly events in the window
    const anomalies = await db
      .select()
      .from(swarmEvents)
      .where(
        and(
          eq(swarmEvents.eventSource, "anomaly-detector"),
          gte(swarmEvents.timestamp, timeLimit)
        )
      )
      .orderBy(desc(swarmEvents.timestamp))
      .all();

    // Filter only mobile sync metrics
    const mobileMetrics = metrics.filter((m) => m.metricName.startsWith("mobile_sync_"));

    return NextResponse.json({
      metrics: mobileMetrics,
      anomalies,
    });
  } catch (err) {
    console.error("[Mobile Diagnostics API] Failed to fetch:", err);
    return NextResponse.json({ error: "Failed to fetch mobile diagnostics" }, { status: 500 });
  }
}

export const GET = requireAuth(handler, "observability:read");
