import { KnowledgeGraphEngine } from './knowledge-graph-engine';
import { KmNode } from '../km-types';

export class GraphTraverser {
  private graph: KnowledgeGraphEngine;

  constructor(graph: KnowledgeGraphEngine) {
    this.graph = graph;
  }

  /**
   * Get all prerequisites (transitive closure) required before a target course can be taken.
   */
  public getPrerequisiteClosure(targetCourseId: string): KmNode[] {
    const prerequisites: Map<string, KmNode> = new Map();
    const queue: string[] = [targetCourseId];
    const visited: Set<string> = new Set([targetCourseId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const inEdges = this.graph.getInboundEdges(current).filter((e) => e.relation === 'prerequisite_of');

      for (const edge of inEdges) {
        if (!visited.has(edge.source)) {
          visited.add(edge.source);
          const node = this.graph.getNode(edge.source);
          if (node) {
            prerequisites.set(node.id, node);
            queue.push(node.id);
          }
        }
      }
    }

    return Array.from(prerequisites.values());
  }

  /**
   * Shortest path between two knowledge nodes (Dijkstra algorithm)
   */
  public findShortestPath(startId: string, endId: string): { path: string[]; distance: number } | null {
    const distances: Map<string, number> = new Map();
    const previous: Map<string, string | null> = new Map();
    const unvisited: Set<string> = new Set();

    for (const node of this.graph.getAllNodes()) {
      distances.set(node.id, Infinity);
      previous.set(node.id, null);
      unvisited.add(node.id);
    }

    distances.set(startId, 0);

    while (unvisited.size > 0) {
      // Find node with minimum distance
      let minNode: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const dist = distances.get(nodeId) ?? Infinity;
        if (dist < minDistance) {
          minDistance = dist;
          minNode = nodeId;
        }
      }

      if (minNode === null || minDistance === Infinity) break;
      if (minNode === endId) break;

      unvisited.delete(minNode);

      const neighbors = this.graph.getOutboundEdges(minNode);
      for (const edge of neighbors) {
        if (unvisited.has(edge.target)) {
          const alt = minDistance + (edge.weight || 1);
          if (alt < (distances.get(edge.target) ?? Infinity)) {
            distances.set(edge.target, alt);
            previous.set(edge.target, minNode);
          }
        }
      }
    }

    if (distances.get(endId) === Infinity) return null;

    const path: string[] = [];
    let curr: string | null = endId;
    while (curr) {
      path.unshift(curr);
      curr = previous.get(curr) || null;
    }

    return { path, distance: distances.get(endId)! };
  }
}
