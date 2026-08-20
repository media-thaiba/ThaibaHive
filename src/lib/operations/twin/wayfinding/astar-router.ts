import { Point3D } from '../twin-types';

export interface GraphNode {
  id: string;
  floorLevel: number;
  coordinates: Point3D;
  isAccessible: boolean;
  isExit: boolean;
  type: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number; // distance or transit time
  isStepFree: boolean;
  isBlocked: boolean;
  hazardLevel?: string;
}

export interface AStarOptions {
  requireStepFree?: boolean;
  avoidBlocked?: boolean;
}

export class AStarRouter {
  public static findPath(
    nodes: Map<string, GraphNode>,
    adjacency: Map<string, GraphEdge[]>,
    startId: string,
    targetId: string,
    options: AStarOptions = { avoidBlocked: true }
  ): { path: string[]; totalCost: number } | null {
    const startNode = nodes.get(startId);
    const targetNode = nodes.get(targetId);
    if (!startNode || !targetNode) return null;

    if (startId === targetId) {
      return { path: [startId], totalCost: 0 };
    }

    const openSet = new Set<string>([startId]);
    const cameFrom = new Map<string, { nodeId: string; edgeCost: number }>();

    const gScore = new Map<string, number>();
    gScore.set(startId, 0);

    const fScore = new Map<string, number>();
    fScore.set(startId, this.heuristic(startNode.coordinates, targetNode.coordinates));

    while (openSet.size > 0) {
      let currentId: string | null = null;
      let lowestF = Infinity;

      for (const id of openSet) {
        const score = fScore.get(id) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          currentId = id;
        }
      }

      if (!currentId) break;

      if (currentId === targetId) {
        // Reconstruct path
        const path: string[] = [currentId];
        const totalCost = gScore.get(currentId) || 0;
        let curr = currentId;
        while (cameFrom.has(curr)) {
          const prev = cameFrom.get(curr)!;
          curr = prev.nodeId;
          path.unshift(curr);
        }
        return { path, totalCost: Number(totalCost.toFixed(2)) };
      }

      openSet.delete(currentId);
      const neighbors = adjacency.get(currentId) || [];

      for (const edge of neighbors) {
        if (options.avoidBlocked && edge.isBlocked) continue;
        if (options.requireStepFree && !edge.isStepFree) continue;

        const neighborId = edge.target;
        const neighborNode = nodes.get(neighborId);
        if (!neighborNode) continue;

        const tentativeG = (gScore.get(currentId) ?? Infinity) + edge.weight;

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, { nodeId: currentId, edgeCost: edge.weight });
          gScore.set(neighborId, tentativeG);
          fScore.set(
            neighborId,
            tentativeG + this.heuristic(neighborNode.coordinates, targetNode.coordinates)
          );

          openSet.add(neighborId);
        }
      }
    }

    return null; // No path found
  }

  private static heuristic(p1: Point3D, p2: Point3D): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z - p2.z) * 2.0; // Multi-floor penalty
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
