import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { PostgresClusterMonitor } from "@/lib/database/cluster-monitor";

export const GET = requireAuth(async (_request: Request, _session) => {
  try {
    const monitor = new PostgresClusterMonitor([
      { nodeId: "node-1-primary", role: "PRIMARY", endpoint: "postgresql://db1.thaibahive.org:5432", isHealthy: true, replicationLagBytes: 0, replicationLagMs: 0, lastCheckedAt: Date.now() },
      { nodeId: "node-2-standby", role: "STANDBY", endpoint: "postgresql://db2.thaibahive.org:5432", isHealthy: true, replicationLagBytes: 512, replicationLagMs: 12, lastCheckedAt: Date.now() },
      { nodeId: "node-3-replica", role: "READ_REPLICA", endpoint: "postgresql://db3.thaibahive.org:5432", isHealthy: true, replicationLagBytes: 2048, replicationLagMs: 45, lastCheckedAt: Date.now() },
    ]);

    const report = monitor.evaluateClusterHealth();
    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}, "database:admin");
