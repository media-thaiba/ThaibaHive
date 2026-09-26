/**
 * Threat Graph Query Engine
 * Sprint-042 (ARES) — ARES-014
 */

import { Neo4jThreatGraphAdapter } from './neo4j-adapter';
import { AttackPathTraversal } from './attack-path-traversal';
import { ThreatGraphNode, AttackPathResult } from './graph-types';

export class ThreatGraphQueryEngine {
  private static instance: ThreatGraphQueryEngine | null = null;
  private adapter: Neo4jThreatGraphAdapter;
  private pathTraversal: AttackPathTraversal;

  private constructor(adapter?: Neo4jThreatGraphAdapter, pathTraversal?: AttackPathTraversal) {
    this.adapter = adapter || Neo4jThreatGraphAdapter.getInstance();
    this.pathTraversal = pathTraversal || AttackPathTraversal.getInstance();
  }

  public static getInstance(
    adapter?: Neo4jThreatGraphAdapter,
    pathTraversal?: AttackPathTraversal
  ): ThreatGraphQueryEngine {
    if (!ThreatGraphQueryEngine.instance) {
      ThreatGraphQueryEngine.instance = new ThreatGraphQueryEngine(adapter, pathTraversal);
    }
    return ThreatGraphQueryEngine.instance;
  }

  public findAttackPaths(sourceId: string, targetId: string): AttackPathResult | null {
    return this.pathTraversal.findAttackPaths(sourceId, targetId);
  }

  public getBlastRadius(cveNodeId: string): { affectedServices: ThreatGraphNode[]; totalRiskScore: number } {
    const directNeighbors = this.adapter.getNeighbors(cveNodeId);
    const affectedServices = directNeighbors.filter((n) => n.type === 'Service' || n.type === 'Asset');
    const totalRiskScore = affectedServices.reduce((acc, s) => acc + s.riskScore, 0);

    return { affectedServices, totalRiskScore };
  }

  public getGraphOverview(): { totalNodes: number; totalEdges: number; nodeTypeCounts: Record<string, number> } {
    const nodes = this.adapter.listNodes();
    const edges = this.adapter.listEdges();

    const nodeTypeCounts: Record<string, number> = {};
    for (const n of nodes) {
      nodeTypeCounts[n.type] = (nodeTypeCounts[n.type] || 0) + 1;
    }

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeTypeCounts,
    };
  }
}
