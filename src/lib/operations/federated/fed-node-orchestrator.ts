import { FederatedNode } from './federated-types';

/**
 * Orchestrator managing distributed campus edge nodes and client selection cohorts
 */
export class FederatedNodeOrchestrator {
  private nodes: Map<string, FederatedNode> = new Map();

  /**
   * Register or update an edge node
   */
  public registerNode(node: FederatedNode): void {
    this.nodes.set(node.nodeId, {
      ...node,
      lastHeartbeat: node.lastHeartbeat || new Date().toISOString(),
    });
  }

  /**
   * Record heartbeat from an edge node
   */
  public recordHeartbeat(nodeId: string, latencyMs?: number): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    node.lastHeartbeat = new Date().toISOString();
    if (latencyMs !== undefined) {
      node.networkLatencyMs = latencyMs;
    }
    if (node.status === 'offline') {
      node.status = 'idle';
    }
    this.nodes.set(nodeId, node);
    return true;
  }

  /**
   * Sample participant cohort for training round
   */
  public selectCohort(
    targetCount: number = 5,
    minReputation: number = 0.5,
    strategy: 'uniform' | 'importance' | 'low_latency' = 'uniform'
  ): FederatedNode[] {
    const availableNodes = Array.from(this.nodes.values()).filter(
      (n) => n.status !== 'offline' && n.reputationScore >= minReputation
    );

    if (availableNodes.length <= targetCount) {
      return availableNodes;
    }

    if (strategy === 'low_latency') {
      return [...availableNodes]
        .sort((a, b) => a.networkLatencyMs - b.networkLatencyMs)
        .slice(0, targetCount);
    }

    if (strategy === 'importance') {
      // Weight by sample count
      return [...availableNodes]
        .sort((a, b) => b.sampleCount - a.sampleCount)
        .slice(0, targetCount);
    }

    // Uniform random selection
    const shuffled = [...availableNodes].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, targetCount);
  }

  /**
   * Mark stale nodes as offline if heartbeat > timeoutMs (default 60s)
   */
  public pruneStaleNodes(timeoutMs: number = 60000): string[] {
    const now = Date.now();
    const offlineNodeIds: string[] = [];

    for (const [nodeId, node] of this.nodes.entries()) {
      const lastSeen = new Date(node.lastHeartbeat).getTime();
      if (now - lastSeen > timeoutMs && node.status !== 'offline') {
        node.status = 'offline';
        this.nodes.set(nodeId, node);
        offlineNodeIds.push(nodeId);
      }
    }
    return offlineNodeIds;
  }

  /**
   * Update reputation score of a node (e.g. after Byzantine checks)
   */
  public updateReputation(nodeId: string, delta: number): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.reputationScore = Math.max(0, Math.min(1.0, node.reputationScore + delta));
      this.nodes.set(nodeId, node);
    }
  }

  /**
   * Retrieve all nodes
   */
  public getAllNodes(): FederatedNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Retrieve single node
   */
  public getNode(nodeId: string): FederatedNode | undefined {
    return this.nodes.get(nodeId);
  }

  public clear(): void {
    this.nodes.clear();
  }
}
