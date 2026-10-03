import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/api/auth-guard";
import { defaultClusterManager } from "../../../../../lib/redis/redis-cluster-manager";
import { defaultStreamingService } from "../../../../../lib/realtime/realtime-streaming-service";

export const GET = requireAuth(async () => {
  try {
    const health = await defaultClusterManager.getClusterHealthMetrics();
    const activeSessions = defaultStreamingService.getActiveSessions();

    return NextResponse.json(
      {
        status: "ok",
        activeConnectionsCount: activeSessions.length,
        clusterMetrics: health,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve realtime health status" },
      { status: 500 }
    );
  }
}, "realtime:stream");
