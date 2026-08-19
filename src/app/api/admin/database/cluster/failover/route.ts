import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { PostgresClusterMonitor } from "@/lib/database/cluster-monitor";
import { PostgresFailoverManager } from "@/lib/database/failover-manager";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { failedNodeId = "node-1-primary" } = body;

    const monitor = new PostgresClusterMonitor([
      { nodeId: "node-1-primary", role: "PRIMARY", endpoint: "postgresql://db1.thaibahive.org:5432", isHealthy: false, replicationLagBytes: 9999, replicationLagMs: 9999, lastCheckedAt: Date.now() },
      { nodeId: "node-2-standby", role: "STANDBY", endpoint: "postgresql://db2.thaibahive.org:5432", isHealthy: true, replicationLagBytes: 512, replicationLagMs: 12, lastCheckedAt: Date.now() },
      { nodeId: "node-3-replica", role: "READ_REPLICA", endpoint: "postgresql://db3.thaibahive.org:5432", isHealthy: true, replicationLagBytes: 2048, replicationLagMs: 45, lastCheckedAt: Date.now() },
    ]);

    const failoverManager = new PostgresFailoverManager(monitor);
    const result = await failoverManager.executeAutomatedFailover(failedNodeId);

    return NextResponse.json({
      success: result.status === "SUCCESS",
      failoverResult: result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}, "database:admin");
