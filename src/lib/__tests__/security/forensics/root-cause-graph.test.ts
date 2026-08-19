import { RootCauseGraph } from '@/lib/security/forensics/root-cause-graph';
import { CorrelatedThreatIncident } from '@/lib/security/forensics/forensic-types';

describe('RootCauseGraph', () => {
  it('generates DAG nodes and edges connecting actor to attack stages and signals', () => {
    const incident: CorrelatedThreatIncident = {
      incidentId: 'inc-02',
      primaryActor: 'bad-actor-99',
      confidenceScore: 85,
      attackStagesDetected: ['INITIAL_ACCESS', 'LATERAL_MOVEMENT'],
      contributingSignals: [
        {
          id: 'sig-geo',
          sourceLayer: 'DEVICE_TRUST',
          targetActorOrEntity: 'bad-actor-99',
          eventType: 'IMPOSSIBLE_TRAVEL',
          severity: 'HIGH',
          details: {},
          timestamp: '2026-08-19T21:00:00Z',
        },
      ],
      summary: 'Test',
      mitreTactics: [],
      recommendedMitigations: [],
    };

    const graph = RootCauseGraph.generate(incident);
    expect(graph.nodes.some((n) => n.id === 'actor-bad-actor-99')).toBe(true);
    expect(graph.nodes.some((n) => n.id === 'stage-INITIAL_ACCESS')).toBe(true);
    expect(graph.edges.length).toBeGreaterThanOrEqual(2);
  });
});
