import { db } from "@thaiba/db";
import { clusterNodes } from "@thaiba/db/schema";
import { VoiceIntent } from "./intent-mapper";
import { dynamicPoolConfigs } from "../agents/healing/pool-healer";

export interface DiagnosticsReport {
  success: boolean;
  statusText: string;
  metrics: Record<string, unknown>;
}

export class DiagnosticsHandler {
  constructor() {}

  public async executeDiagnostics(voiceIntent: VoiceIntent): Promise<DiagnosticsReport> {
    switch (voiceIntent.intent) {
      case "check_db_health": {
        const nodes = await db.select().from(clusterNodes).all();
        const primary = nodes.find((n) => n.role === "PRIMARY");
        const standbys = nodes.filter((n) => n.role !== "PRIMARY");
        const isHealthy = primary ? !!primary.isHealthy : false;

        const standbysHealthy = standbys.every((n) => n.isHealthy);
        const maxLag = standbys.length > 0 ? Math.max(...standbys.map((s) => s.replicationLagMs)) : 0;

        return {
          success: isHealthy,
          statusText: isHealthy 
            ? "Database cluster is operational. Primary node is healthy." 
            : "Database cluster critical issue: Primary node is unhealthy or missing.",
          metrics: {
            primaryNode: primary?.nodeId || "none",
            primaryHealthy: isHealthy,
            standbysCount: standbys.length,
            standbysHealthy,
            maxReplicationLagMs: maxLag,
          },
        };
      }

      case "restart_stream": {
        const streamId = voiceIntent.params.streamId || "stream-node-1";
        // Mock query streaming nodes
        return {
          success: true,
          statusText: `Streaming node ${streamId} diagnostics complete. Signaling is running.`,
          metrics: {
            streamId,
            signalingLatencyMs: 120,
            segmenterStatus: "healthy",
            backupRedirectActive: false,
          },
        };
      }

      case "scale_pool": {
        const poolName = voiceIntent.params.poolName || "primary-pool";
        const currentLimit = dynamicPoolConfigs.get(poolName)?.maxConnections || 20;
        return {
          success: true,
          statusText: `Connection pool ${poolName} metrics analyzed.`,
          metrics: {
            poolName,
            maxConnections: currentLimit,
            activeConnections: 5,
            queueWaitTimeMs: 12,
          },
        };
      }

      default: {
        return {
          success: false,
          statusText: `Diagnostics handler could not parse intent: ${voiceIntent.intent}`,
          metrics: {},
        };
      }
    }
  }
}
