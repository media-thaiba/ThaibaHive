import { PostgresClusterMonitor } from "./cluster-monitor";
import { PostgresClusterNode } from "./types";

export interface FailoverResult {
  failedPrimaryId: string;
  promotedNodeId: string;
  recoveryDurationMs: number;
  status: "SUCCESS" | "FAILED";
  newPrimaryEndpoint: string;
  message: string;
}

export class PostgresFailoverManager {
  private monitor: PostgresClusterMonitor;

  constructor(monitor: PostgresClusterMonitor) {
    this.monitor = monitor;
  }

  public async executeAutomatedFailover(failedNodeId: string): Promise<FailoverResult> {
    const startTime = Date.now();
    const healthReport = this.monitor.evaluateClusterHealth();

    // Enforce quorum check before promotion
    if (!healthReport.isQuorumHealthy) {
      return {
        failedPrimaryId: failedNodeId,
        promotedNodeId: "NONE",
        recoveryDurationMs: Date.now() - startTime,
        status: "FAILED",
        newPrimaryEndpoint: "",
        message: "Failover aborted: Cluster quorum is not healthy!",
      };
    }

    // Select candidate standby node with lowest replication lag (< 2s)
    const eligibleStandbys = healthReport.nodes.filter(
      (n) => n.nodeId !== failedNodeId && n.isHealthy && (n.role === "STANDBY" || n.role === "READ_REPLICA") && n.replicationLagMs <= 2000
    );

    if (eligibleStandbys.length === 0) {
      return {
        failedPrimaryId: failedNodeId,
        promotedNodeId: "NONE",
        recoveryDurationMs: Date.now() - startTime,
        status: "FAILED",
        newPrimaryEndpoint: "",
        message: "Failover aborted: No eligible standby nodes within replication lag SLA (<= 2000ms)",
      };
    }

    eligibleStandbys.sort((a, b) => a.replicationLagMs - b.replicationLagMs);
    const promotedNode = eligibleStandbys[0];

    // Promote standby node to PRIMARY
    promotedNode.role = "PRIMARY";
    this.monitor.updateNodeStatus(promotedNode.nodeId, true, 0, 0);

    // Mark old node as OFFLINE
    this.monitor.updateNodeStatus(failedNodeId, false, 999999, 999999);

    const recoveryDurationMs = Date.now() - startTime;

    return {
      failedPrimaryId: failedNodeId,
      promotedNodeId: promotedNode.nodeId,
      recoveryDurationMs,
      status: "SUCCESS",
      newPrimaryEndpoint: promotedNode.endpoint,
      message: `Node ${promotedNode.nodeId} successfully promoted to PRIMARY in ${recoveryDurationMs}ms`,
    };
  }
}
