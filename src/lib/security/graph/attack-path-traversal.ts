/**
 * Graph Attack Path Traversal Engine
 * Sprint-042 (ARES) — ARES-014
 */

import { Neo4jThreatGraphAdapter } from './neo4j-adapter';
import { AttackPathResult } from './graph-types';

export class AttackPathTraversal {
  private static instance: AttackPathTraversal | null = null;
  private graphAdapter: Neo4jThreatGraphAdapter;

  private constructor(graphAdapter?: Neo4jThreatGraphAdapter) {
    this.graphAdapter = graphAdapter || Neo4jThreatGraphAdapter.getInstance();
  }

  public static getInstance(graphAdapter?: Neo4jThreatGraphAdapter): AttackPathTraversal {
    if (!AttackPathTraversal.instance) {
      AttackPathTraversal.instance = new AttackPathTraversal(graphAdapter);
    }
    return AttackPathTraversal.instance;
  }

  /**
   * Finds shortest attack path between source threat node and target asset using BFS/Dijkstra
   * Target query latency: < 2 seconds for 100K+ nodes
   */
  public findAttackPaths(sourceThreatId: string, targetAssetId: string): AttackPathResult | null {
    const sourceNode = this.graphAdapter.getNode(sourceThreatId);
    const targetNode = this.graphAdapter.getNode(targetAssetId);

    if (!sourceNode || !targetNode) {
      return null;
    }

    const queue: { nodeId: string; pathNodeIds: string[]; pathEdgeIds: string[] }[] = [
      { nodeId: sourceThreatId, pathNodeIds: [sourceThreatId], pathEdgeIds: [] },
    ];
    const visited = new Set<string>([sourceThreatId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.nodeId === targetAssetId) {
        // Reconstruct path
        const pathNodes = current.pathNodeIds.map((id) => this.graphAdapter.getNode(id)!).filter(Boolean);
        const pathEdges = current.pathEdgeIds.map((id) => this.graphAdapter.getEdge(id)!).filter(Boolean);

        const cumulativeRiskScore = pathNodes.reduce((acc, n) => acc + (n.riskScore || 50), 0) / pathNodes.length;

        // The middle hop represents the primary choke point
        const chokePointIndex = Math.floor(pathNodes.length / 2);
        const criticalChokePointNodeId = pathNodes[chokePointIndex]?.id;

        return {
          sourceThreatNode: sourceNode,
          targetAssetNode: targetNode,
          pathNodes,
          pathEdges,
          cumulativeRiskScore: Number(cumulativeRiskScore.toFixed(1)),
          hopCount: pathEdges.length,
          criticalChokePointNodeId,
        };
      }

      const outgoing = this.graphAdapter.getOutgoingEdges(current.nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.targetId)) {
          visited.add(edge.targetId);
          queue.push({
            nodeId: edge.targetId,
            pathNodeIds: [...current.pathNodeIds, edge.targetId],
            pathEdgeIds: [...current.pathEdgeIds, edge.id],
          });
        }
      }
    }

    return null;
  }
}
