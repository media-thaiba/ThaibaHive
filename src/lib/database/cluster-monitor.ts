import { PostgresClusterNode, ClusterHealthReport } from "./types";

export class PostgresClusterMonitor {
  private nodes: Map<string, PostgresClusterNode> = new Map();

  constructor(initialNodes: PostgresClusterNode[] = []) {
    for (const n of initialNodes) {
      this.nodes.set(n.nodeId, { ...n });
    }
  }

  public registerNode(node: PostgresClusterNode): void {
    this.nodes.set(node.nodeId, { ...node });
  }

  public updateNodeStatus(
    nodeId: string,
    isHealthy: boolean,
    replicationLagBytes: number,
    replicationLagMs: number
  ): void {
    const existing = this.nodes.get(nodeId);
    if (existing) {
      existing.isHealthy = isHealthy;
      existing.replicationLagBytes = replicationLagBytes;
      existing.replicationLagMs = replicationLagMs;
      existing.lastCheckedAt = Date.now();
    }
  }

  public evaluateClusterHealth(): ClusterHealthReport {
    const nodeList = Array.from(this.nodes.values());
    const primary = nodeList.find((n) => n.role === "PRIMARY" && n.isHealthy);
    const healthyCount = nodeList.filter((n) => n.isHealthy).length;
    const maxLag = nodeList.reduce((max, n) => Math.max(max, n.replicationLagMs), 0);

    // Quorum is healthy if at least ceil(total / 2) + 1 nodes are healthy, or >= 2 out of 3
    const isQuorumHealthy = healthyCount >= Math.ceil(nodeList.length / 2);

    return {
      primaryNodeId: primary ? primary.nodeId : "UNKNOWN",
      totalNodes: nodeList.length,
      healthyNodesCount: healthyCount,
      isQuorumHealthy,
      maxReplicationLagMs: maxLag,
      nodes: nodeList,
      timestamp: Date.now(),
    };
  }
}
