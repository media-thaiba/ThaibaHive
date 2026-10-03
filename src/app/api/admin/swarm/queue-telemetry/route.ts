import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { WorkspaceAggregationService } from "@/lib/services/workspace-aggregation";

async function handler(req: Request, session: any) {
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const stats = await WorkspaceAggregationService.getQueueTelemetryMetrics();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[Queue Telemetry API] Failed to fetch queue telemetry:", err);
    return NextResponse.json({ error: "Failed to fetch queue telemetry" }, { status: 500 });
  }
}

export const GET = requireAuth(handler, "system:telemetry");
