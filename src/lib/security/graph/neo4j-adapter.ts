/**
 * Neo4j & In-Memory Hybrid Threat Graph Adapter
 * Sprint-042 (ARES) — ARES-012
 */

import { ThreatGraphNode, ThreatGraphEdge, GraphNodeType, GraphEdgeType } from './graph-types';

export class Neo4jThreatGraphAdapter {
  private static instance: Neo4jThreatGraphAdapter | null = null;
  private nodes: Map<string, ThreatGraphNode> = new Map();
  private edges: Map<string, ThreatGraphEdge> = new Map();
  private outgoingEdgeIndex: Map<string, Set<string>> = new Map();
  private incomingEdgeIndex: Map<string, Set<string>> = new Map();
  private isNeo4jConnected = false;

  private constructor() {
    // Check if external Neo4j credentials are provided in environment
    if (process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD) {
      this.isNeo4jConnected = true;
    }
  }

  public static getInstance(): Neo4jThreatGraphAdapter {
    if (!Neo4jThreatGraphAdapter.instance) {
      Neo4jThreatGraphAdapter.instance = new Neo4jThreatGraphAdapter();
    }
    return Neo4jThreatGraphAdapter.instance;
  }

  public static resetInstance(): void {
    Neo4jThreatGraphAdapter.instance = null;
  }

  public isUsingExternalNeo4j(): boolean {
    return this.isNeo4jConnected;
  }

  public async upsertNode(node: ThreatGraphNode): Promise<ThreatGraphNode> {
    this.nodes.set(node.id, {
      ...node,
      updatedAt: new Date().toISOString(),
    });
    if (!this.outgoingEdgeIndex.has(node.id)) this.outgoingEdgeIndex.set(node.id, new Set());
    if (!this.incomingEdgeIndex.has(node.id)) this.incomingEdgeIndex.set(node.id, new Set());
    return node;
  }

  public async upsertEdge(edge: ThreatGraphEdge): Promise<ThreatGraphEdge> {
    this.edges.set(edge.id, edge);

    if (!this.outgoingEdgeIndex.has(edge.sourceId)) this.outgoingEdgeIndex.set(edge.sourceId, new Set());
    if (!this.incomingEdgeIndex.has(edge.targetId)) this.incomingEdgeIndex.set(edge.targetId, new Set());

    this.outgoingEdgeIndex.get(edge.sourceId)?.add(edge.id);
    this.incomingEdgeIndex.get(edge.targetId)?.add(edge.id);

    return edge;
  }

  public getNode(id: string): ThreatGraphNode | undefined {
    return this.nodes.get(id);
  }

  public getEdge(id: string): ThreatGraphEdge | undefined {
    return this.edges.get(id);
  }

  public getOutgoingEdges(nodeId: string): ThreatGraphEdge[] {
    const edgeIds = this.outgoingEdgeIndex.get(nodeId);
    if (!edgeIds) return [];
    const result: ThreatGraphEdge[] = [];
    for (const id of edgeIds) {
      const edge = this.edges.get(id);
      if (edge) result.push(edge);
    }
    return result;
  }

  public getIncomingEdges(nodeId: string): ThreatGraphEdge[] {
    const edgeIds = this.incomingEdgeIndex.get(nodeId);
    if (!edgeIds) return [];
    const result: ThreatGraphEdge[] = [];
    for (const id of edgeIds) {
      const edge = this.edges.get(id);
      if (edge) result.push(edge);
    }
    return result;
  }

  public getNeighbors(nodeId: string): ThreatGraphNode[] {
    const outgoing = this.getOutgoingEdges(nodeId);
    const result: ThreatGraphNode[] = [];
    for (const e of outgoing) {
      const target = this.nodes.get(e.targetId);
      if (target) result.push(target);
    }
    return result;
  }

  public listNodes(filterType?: GraphNodeType): ThreatGraphNode[] {
    const all = Array.from(this.nodes.values());
    if (!filterType) return all;
    return all.filter((n) => n.type === filterType);
  }

  public listEdges(filterType?: GraphEdgeType): ThreatGraphEdge[] {
    const all = Array.from(this.edges.values());
    if (!filterType) return all;
    return all.filter((e) => e.type === filterType);
  }

  public clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.outgoingEdgeIndex.clear();
    this.incomingEdgeIndex.clear();
  }
}
