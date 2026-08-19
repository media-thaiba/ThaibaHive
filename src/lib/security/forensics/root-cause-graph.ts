/**
 * Root-Cause DAG Graph Generator
 * Sprint-041 (ZASM)
 */

import {
  CorrelatedThreatIncident,
  RootCauseGraphNode,
  RootCauseGraphEdge,
} from './forensic-types';
import { ThreatCorrelator } from './threat-correlator';

export class RootCauseGraph {
  /**
   * Generates a DAG graph representation of an attack root cause and trajectory
   */
  public static generate(incident: CorrelatedThreatIncident): {
    nodes: RootCauseGraphNode[];
    edges: RootCauseGraphEdge[];
  } {
    const nodes: RootCauseGraphNode[] = [];
    const edges: RootCauseGraphEdge[] = [];

    // 1. Root Actor Node
    const actorNodeId = `actor-${incident.primaryActor}`;
    nodes.push({
      id: actorNodeId,
      label: `Actor: ${incident.primaryActor}`,
      type: 'ACTOR',
      severity: 'CRITICAL',
    });

    // 2. Stage Nodes and Signal Nodes
    let previousStageNodeId: string | null = null;

    for (const stage of incident.attackStagesDetected) {
      const stageNodeId = `stage-${stage}`;
      nodes.push({
        id: stageNodeId,
        label: `Stage: ${stage}`,
        type: 'STAGE',
      });

      if (!previousStageNodeId) {
        // Link actor to first stage
        edges.push({
          from: actorNodeId,
          to: stageNodeId,
          relationship: 'TRIGGERED',
        });
      } else {
        // Link sequence of stages
        edges.push({
          from: previousStageNodeId,
          to: stageNodeId,
          relationship: 'ESCALATED_TO',
        });
      }

      previousStageNodeId = stageNodeId;
    }

    // 3. Contributing Signals linked to Stages
    for (const sig of incident.contributingSignals) {
      const signalNodeId = `sig-${sig.id}`;
      const stage = ThreatCorrelator.mapSignalToStage(sig);
      const stageNodeId = `stage-${stage}`;

      nodes.push({
        id: signalNodeId,
        label: `${sig.eventType} [${sig.sourceLayer}]`,
        type: 'SIGNAL',
        severity: sig.severity,
      });

      edges.push({
        from: stageNodeId,
        to: signalNodeId,
        relationship: 'TARGETED',
      });
    }

    return { nodes, edges };
  }
}
