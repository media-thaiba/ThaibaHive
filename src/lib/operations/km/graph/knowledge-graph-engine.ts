import { KmNode, KmEdge, KmEntityType, KmRelationType, GraphTraversalPath } from '../km-types';
import { kmStore } from '@/lib/db/km-store';

export class KnowledgeGraphEngine {
  private nodes: Map<string, KmNode> = new Map();
  private adjacencyList: Map<string, KmEdge[]> = new Map();
  private reverseAdjacencyList: Map<string, KmEdge[]> = new Map();

  constructor() {
    this.seedDefaultCampusGraph();
  }

  public addNode(node: KmNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
    if (!this.reverseAdjacencyList.has(node.id)) {
      this.reverseAdjacencyList.set(node.id, []);
    }
  }

  public addEdge(edge: KmEdge): void {
    if (!this.nodes.has(edge.source)) {
      this.addNode({ id: edge.source, name: edge.source, type: 'course' });
    }
    if (!this.nodes.has(edge.target)) {
      this.addNode({ id: edge.target, name: edge.target, type: 'course' });
    }

    const currentEdges = this.adjacencyList.get(edge.source) || [];
    currentEdges.push(edge);
    this.adjacencyList.set(edge.source, currentEdges);

    const currentReverse = this.reverseAdjacencyList.get(edge.target) || [];
    currentReverse.push(edge);
    this.reverseAdjacencyList.set(edge.target, currentReverse);
  }

  public getNode(nodeId: string): KmNode | undefined {
    return this.nodes.get(nodeId);
  }

  public getOutboundEdges(nodeId: string): KmEdge[] {
    return this.adjacencyList.get(nodeId) || [];
  }

  public getInboundEdges(nodeId: string): KmEdge[] {
    return this.reverseAdjacencyList.get(nodeId) || [];
  }

  public getAllNodes(): KmNode[] {
    return Array.from(this.nodes.values());
  }

  public getAllEdges(): KmEdge[] {
    const edges: KmEdge[] = [];
    for (const edgeList of this.adjacencyList.values()) {
      edges.push(...edgeList);
    }
    return edges;
  }

  /**
   * Multi-hop traversal (BFS) up to maxHops depth
   */
  public traverseMultiHop(
    startNodeId: string,
    maxHops: number = 3,
    filterRelation?: KmRelationType
  ): GraphTraversalPath[] {
    const paths: GraphTraversalPath[] = [];
    const queue: Array<{ currentId: string; visitedNodes: KmNode[]; visitedEdges: KmEdge[]; currentWeight: number }> = [];

    const startNode = this.nodes.get(startNodeId);
    if (!startNode) return paths;

    queue.push({ currentId: startNodeId, visitedNodes: [startNode], visitedEdges: [], currentWeight: 0 });

    while (queue.length > 0) {
      const { currentId, visitedNodes, visitedEdges, currentWeight } = queue.shift()!;

      if (visitedNodes.length > 1) {
        paths.push({
          nodes: [...visitedNodes],
          edges: [...visitedEdges],
          totalWeight: currentWeight,
        });
      }

      if (visitedNodes.length - 1 >= maxHops) continue;

      const outbound = this.getOutboundEdges(currentId);
      for (const edge of outbound) {
        if (filterRelation && edge.relation !== filterRelation) continue;

        const nextNode = this.nodes.get(edge.target);
        if (!nextNode) continue;

        // Prevent cyclic infinite loops in path
        if (visitedNodes.some((n) => n.id === nextNode.id)) continue;

        queue.push({
          currentId: nextNode.id,
          visitedNodes: [...visitedNodes, nextNode],
          visitedEdges: [...visitedEdges, edge],
          currentWeight: currentWeight + (edge.weight || 1),
        });
      }
    }

    return paths;
  }

  /**
   * Detect circular dependencies in prerequisite relations
   */
  public detectCycles(): { hasCycles: boolean; cyclePaths: string[][] } {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cyclePaths: string[][] = [];

    const dfs = (nodeId: string, currentPath: string[]) => {
      visited.add(nodeId);
      recStack.add(nodeId);
      currentPath.push(nodeId);

      const edges = this.getOutboundEdges(nodeId).filter(
        (e) => e.relation === 'prerequisite_of' || e.relation === 'co_requisite'
      );

      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          dfs(edge.target, [...currentPath]);
        } else if (recStack.has(edge.target)) {
          cyclePaths.push([...currentPath, edge.target]);
        }
      }

      recStack.delete(nodeId);
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return {
      hasCycles: cyclePaths.length > 0,
      cyclePaths,
    };
  }

  private seedDefaultCampusGraph(): void {
    // Core Computer Science courses & relations
    const seedNodes: KmNode[] = [
      { id: 'CS-101', name: 'Intro to Computer Science', type: 'course', code: 'CS-101', metadata: { credits: 4 } },
      { id: 'CS-102', name: 'Data Structures & Algorithms', type: 'course', code: 'CS-102', metadata: { credits: 4 } },
      { id: 'CS-201', name: 'Computer Architecture', type: 'course', code: 'CS-201', metadata: { credits: 3 } },
      { id: 'CS-301', name: 'Operating Systems', type: 'course', code: 'CS-301', metadata: { credits: 4 } },
      { id: 'CS-302', name: 'Database Management Systems', type: 'course', code: 'CS-302', metadata: { credits: 3 } },
      { id: 'CS-401', name: 'Artificial Intelligence', type: 'course', code: 'CS-401', metadata: { credits: 4 } },
      { id: 'CS-499', name: 'Senior Capstone Project', type: 'course', code: 'CS-499', metadata: { credits: 4 } },
      { id: 'DEPT-CS', name: 'Department of Computer Science', type: 'department', code: 'CS' },
      { id: 'MAJ-BSCS', name: 'B.S. in Computer Science', type: 'major', code: 'BS-CS' },
      { id: 'POL-GRAD-2026', name: 'Graduation Requirements Policy', type: 'policy', code: 'REG-2026-B' },
    ];

    for (const node of seedNodes) {
      this.addNode(node);
    }

    const seedEdges: KmEdge[] = [
      { id: 'e1', source: 'CS-101', target: 'CS-102', relation: 'prerequisite_of', weight: 1.0 },
      { id: 'e2', source: 'CS-102', target: 'CS-201', relation: 'prerequisite_of', weight: 1.0 },
      { id: 'e3', source: 'CS-102', target: 'CS-301', relation: 'prerequisite_of', weight: 1.0 },
      { id: 'e4', source: 'CS-102', target: 'CS-302', relation: 'prerequisite_of', weight: 1.0 },
      { id: 'e5', source: 'CS-301', target: 'CS-401', relation: 'prerequisite_of', weight: 1.0 },
      { id: 'e6', source: 'CS-301', target: 'CS-499', relation: 'prerequisite_of', weight: 1.0 },
      { id: 'e7', source: 'CS-101', target: 'DEPT-CS', relation: 'offered_by', weight: 1.0 },
      { id: 'e8', source: 'CS-401', target: 'MAJ-BSCS', relation: 'fulfills_requirement', weight: 1.0 },
      { id: 'e9', source: 'MAJ-BSCS', target: 'POL-GRAD-2026', relation: 'governed_by', weight: 1.0 },
    ];

    for (const edge of seedEdges) {
      this.addEdge(edge);
    }
  }
}

export const campusGraph = new KnowledgeGraphEngine();
