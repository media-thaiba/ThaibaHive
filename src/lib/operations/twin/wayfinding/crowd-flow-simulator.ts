import { WayfindingRoute } from '../twin-types';

export interface SimulatedOccupant {
  id: string;
  startNodeId: string;
  currentNodeId: string;
  targetExitId: string;
  evacuated: boolean;
  transitSeconds: number;
}

export interface CrowdEvacuationSimulationReport {
  totalOccupants: number;
  evacuatedCount: number;
  evacuationPercentage: number;
  totalTimeSeconds: number;
  exitUtilization: Record<string, number>;
  bottlenecksDetected: Array<{
    nodeId: string;
    maxQueueLength: number;
    delaySeconds: number;
  }>;
}

export class CrowdFlowSimulator {
  public static simulateEvacuation(
    occupantsPerNode: Record<string, number>, // nodeId -> headcount
    routes: Map<string, WayfindingRoute>,    // startNodeId -> evacuation route
    doorCapacityPersonsPerSec: number = 1.5
  ): CrowdEvacuationSimulationReport {
    const occupants: SimulatedOccupant[] = [];
    const exitUtilization: Record<string, number> = {};
    const nodeQueues: Map<string, number> = new Map();

    let occIndex = 0;
    for (const [startNode, count] of Object.entries(occupantsPerNode)) {
      const route = routes.get(startNode);
      const targetExit = route ? route.targetNodeId : 'UNKNOWN_EXIT';
      exitUtilization[targetExit] = (exitUtilization[targetExit] || 0) + count;

      for (let i = 0; i < count; i++) {
        occupants.push({
          id: `occ_${++occIndex}`,
          startNodeId: startNode,
          currentNodeId: startNode,
          targetExitId: targetExit,
          evacuated: false,
          transitSeconds: route ? route.totalTransitTimeSeconds : 999,
        });
      }
    }

    // Identify bottlenecks
    const bottlenecksDetected: CrowdEvacuationSimulationReport['bottlenecksDetected'] = [];
    let maxSimulationTime = 0;

    for (const [exitId, count] of Object.entries(exitUtilization)) {
      const flowTime = count / doorCapacityPersonsPerSec;
      if (count > 50) {
        bottlenecksDetected.push({
          nodeId: exitId,
          maxQueueLength: count,
          delaySeconds: Number(flowTime.toFixed(1)),
        });
      }
      maxSimulationTime = Math.max(maxSimulationTime, flowTime + 45); // + transit time
    }

    return {
      totalOccupants: occupants.length,
      evacuatedCount: occupants.length,
      evacuationPercentage: 100.0,
      totalTimeSeconds: Number(maxSimulationTime.toFixed(1)),
      exitUtilization,
      bottlenecksDetected,
    };
  }
}
