import { PostgresClusterMonitor } from "./cluster-monitor";

export class DynamicReplicaPool {
  private monitor: PostgresClusterMonitor;

  constructor(monitor: PostgresClusterMonitor) {
    this.monitor = monitor;
  }

  public getPrimaryNodeEndpoint(): string {
    const report = this.monitor.evaluateClusterHealth();
    const primary = report.nodes.find((n) => n.nodeId === report.primaryNodeId);
    if (!primary || !primary.isHealthy) {
      throw new Error("Primary database node is currently unreachable!");
    }
    return primary.endpoint;
  }

  public getReadReplicaEndpoint(maxAllowedLagMs: number = 2000): string {
    const report = this.monitor.evaluateClusterHealth();
    const eligibleReplicas = report.nodes.filter(
      (n) => n.isHealthy && n.role !== "PRIMARY" && n.replicationLagMs <= maxAllowedLagMs
    );

    if (eligibleReplicas.length === 0) {
      // Fallback to primary if all replicas are lagging or unavailable
      return this.getPrimaryNodeEndpoint();
    }

    // Round-robin or lowest lag selection
    eligibleReplicas.sort((a, b) => a.replicationLagMs - b.replicationLagMs);
    return eligibleReplicas[0].endpoint;
  }
}
