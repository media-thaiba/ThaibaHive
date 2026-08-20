import { WayfindingRoute, HazardType } from '../twin-types';
import { SpatialGraphEngine } from './spatial-graph-engine';
import { CrowdFlowSimulator, CrowdEvacuationSimulationReport } from './crowd-flow-simulator';

export interface HazardDeclaration {
  hazardId: string;
  facilityId: string;
  hazardType: HazardType;
  blockedNodeIds: string[];
  blockedEdgeIds: string[];
  declaredAt: string;
}

export class EmergencyEvacuationRouter {
  private graphEngine: SpatialGraphEngine;
  private activeHazards: Map<string, HazardDeclaration> = new Map();

  constructor(graphEngine: SpatialGraphEngine) {
    this.graphEngine = graphEngine;
  }

  public declareHazard(hazard: HazardDeclaration): void {
    this.activeHazards.set(hazard.hazardId, hazard);

    for (const edgeId of hazard.blockedEdgeIds) {
      this.graphEngine.setEdgeBlocked(edgeId, true, hazard.hazardType);
    }
  }

  public clearHazard(hazardId: string): void {
    const hazard = this.activeHazards.get(hazardId);
    if (!hazard) return;

    for (const edgeId of hazard.blockedEdgeIds) {
      this.graphEngine.setEdgeBlocked(edgeId, false, 'none');
    }
    this.activeHazards.delete(hazardId);
  }

  /**
   * Compute dynamic shortest-path evacuation route from startNode to nearest safe emergency exit
   */
  public calculateEvacuationRoute(
    facilityId: string,
    startNodeId: string,
    requireStepFree: boolean = false
  ): WayfindingRoute | null {
    const exitNodes = this.graphEngine.getExitNodes();
    if (exitNodes.length === 0) return null;

    let shortestRoute: WayfindingRoute | null = null;
    let shortestDistance = Infinity;

    for (const exit of exitNodes) {
      const route = this.graphEngine.findRoute(facilityId, startNodeId, exit.id, {
        avoidBlocked: true,
        requireStepFree,
      });

      if (route && route.totalDistanceMeters < shortestDistance) {
        shortestDistance = route.totalDistanceMeters;
        shortestRoute = {
          ...route,
          isEmergencyRoute: true,
        };
      }
    }

    return shortestRoute;
  }

  /**
   * Calculate evacuation routes for all building nodes in $< 5$s and simulate crowd flow
   */
  public computeAllEvacuationRoutesAndSimulate(
    facilityId: string,
    nodeHeadcounts: Record<string, number>
  ): {
    routes: Map<string, WayfindingRoute>;
    simulationReport: CrowdEvacuationSimulationReport;
    calculationTimeMs: number;
  } {
    const startTime = Date.now();
    const routes = new Map<string, WayfindingRoute>();

    for (const nodeId of Object.keys(nodeHeadcounts)) {
      const route = this.calculateEvacuationRoute(facilityId, nodeId);
      if (route) {
        routes.set(nodeId, route);
      }
    }

    const calculationTimeMs = Date.now() - startTime;
    const simulationReport = CrowdFlowSimulator.simulateEvacuation(nodeHeadcounts, routes);

    return {
      routes,
      simulationReport,
      calculationTimeMs,
    };
  }

  public getActiveHazards(): HazardDeclaration[] {
    return Array.from(this.activeHazards.values());
  }
}
