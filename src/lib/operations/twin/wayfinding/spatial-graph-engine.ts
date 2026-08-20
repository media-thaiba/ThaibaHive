import { Point3D, WayfindingNodeType, WayfindingRoute } from '../twin-types';
import { AStarRouter, GraphNode, GraphEdge } from './astar-router';

export class SpatialGraphEngine {
  private nodes: Map<string, GraphNode> = new Map();
  private adjacency: Map<string, GraphEdge[]> = new Map();

  public addNode(node: {
    id: string;
    floorLevel: number;
    coordinates: Point3D;
    isAccessible?: boolean;
    isExit?: boolean;
    type?: WayfindingNodeType;
  }): void {
    const n: GraphNode = {
      id: node.id,
      floorLevel: node.floorLevel,
      coordinates: node.coordinates,
      isAccessible: node.isAccessible !== undefined ? node.isAccessible : true,
      isExit: node.isExit !== undefined ? node.isExit : false,
      type: node.type || 'hallway_intersection',
    };
    this.nodes.set(n.id, n);
    if (!this.adjacency.has(n.id)) {
      this.adjacency.set(n.id, []);
    }
  }

  public addEdge(edge: {
    id: string;
    source: string;
    target: string;
    distanceMeters?: number;
    transitTimeSeconds?: number;
    isStepFree?: boolean;
    isBlocked?: boolean;
    hazardLevel?: string;
    bidirectional?: boolean;
  }): void {
    const srcNode = this.nodes.get(edge.source);
    const tgtNode = this.nodes.get(edge.target);

    let dist = edge.distanceMeters;
    if (dist === undefined && srcNode && tgtNode) {
      const dx = srcNode.coordinates.x - tgtNode.coordinates.x;
      const dy = srcNode.coordinates.y - tgtNode.coordinates.y;
      const dz = srcNode.coordinates.z - tgtNode.coordinates.z;
      dist = Number(Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(1));
    }
    const weight = dist || 1.0;

    const e: GraphEdge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      weight,
      isStepFree: edge.isStepFree !== undefined ? edge.isStepFree : true,
      isBlocked: edge.isBlocked !== undefined ? edge.isBlocked : false,
      hazardLevel: edge.hazardLevel || 'none',
    };

    const adj = this.adjacency.get(edge.source) || [];
    adj.push(e);
    this.adjacency.set(edge.source, adj);

    if (edge.bidirectional !== false) {
      const reverseEdge: GraphEdge = {
        id: `${edge.id}_rev`,
        source: edge.target,
        target: edge.source,
        weight,
        isStepFree: e.isStepFree,
        isBlocked: e.isBlocked,
        hazardLevel: e.hazardLevel,
      };
      const revAdj = this.adjacency.get(edge.target) || [];
      revAdj.push(reverseEdge);
      this.adjacency.set(edge.target, revAdj);
    }
  }

  public setEdgeBlocked(edgeId: string, isBlocked: boolean, hazardLevel: string = 'none'): void {
    for (const [_, edges] of this.adjacency.entries()) {
      for (const edge of edges) {
        if (edge.id === edgeId || edge.id === `${edgeId}_rev`) {
          edge.isBlocked = isBlocked;
          edge.hazardLevel = hazardLevel;
        }
      }
    }
  }

  public findRoute(
    facilityId: string,
    sourceNodeId: string,
    targetNodeId: string,
    options: { requireStepFree?: boolean; avoidBlocked?: boolean } = { avoidBlocked: true }
  ): WayfindingRoute | null {
    const pathResult = AStarRouter.findPath(this.nodes, this.adjacency, sourceNodeId, targetNodeId, options);
    if (!pathResult) return null;

    const pathNodes: WayfindingRoute['pathNodes'] = [];
    const polyline: Point3D[] = [];

    for (let i = 0; i < pathResult.path.length; i++) {
      const nodeId = pathResult.path[i];
      const node = this.nodes.get(nodeId)!;
      polyline.push(node.coordinates);

      let instruction = `Proceed to ${node.id}`;
      if (i === 0) instruction = `Start at ${node.id}`;
      else if (i === pathResult.path.length - 1) instruction = `Arrive at destination ${node.id}`;
      else if (node.type === 'stairwell') instruction = `Take stairs to Floor ${node.floorLevel}`;
      else if (node.type === 'elevator') instruction = `Take elevator to Floor ${node.floorLevel}`;
      else if (node.type === 'emergency_exit') instruction = `Exit building through Emergency Exit`;

      pathNodes.push({
        nodeId: node.id,
        floorLevel: node.floorLevel,
        nodeType: node.type as WayfindingNodeType,
        coordinates: node.coordinates,
        instruction,
      });
    }

    return {
      routeId: `route_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      facilityId,
      sourceNodeId,
      targetNodeId,
      totalDistanceMeters: pathResult.totalCost,
      totalTransitTimeSeconds: Math.round(pathResult.totalCost * 0.8), // ~1.2 m/s walking speed
      isStepFree: options.requireStepFree || false,
      isEmergencyRoute: false,
      pathNodes,
      polyline,
    };
  }

  public getExitNodes(): GraphNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.isExit);
  }

  public getNodes(): Map<string, GraphNode> {
    return this.nodes;
  }

  public clear(): void {
    this.nodes.clear();
    this.adjacency.clear();
  }
}
