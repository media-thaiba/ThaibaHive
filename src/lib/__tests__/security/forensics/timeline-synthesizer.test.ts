import { TimelineSynthesizer } from '@/lib/security/forensics/timeline-synthesizer';
import { CorrelatedThreatIncident } from '@/lib/security/forensics/forensic-types';

describe('TimelineSynthesizer', () => {
  it('orders contributing signals into a chronological timeline', () => {
    const incident: CorrelatedThreatIncident = {
      incidentId: 'inc-01',
      primaryActor: 'dev-compromised',
      confidenceScore: 90,
      attackStagesDetected: ['CREDENTIAL_ACCESS', 'LATERAL_MOVEMENT'],
      contributingSignals: [
        {
          id: 'sig-b',
          sourceLayer: 'MICRO_SEGMENTATION',
          targetActorOrEntity: 'dev-compromised',
          eventType: 'PORT_SCAN_BLOCKED',
          severity: 'HIGH',
          details: {},
          timestamp: '2026-08-19T21:05:00Z',
        },
        {
          id: 'sig-a',
          sourceLayer: 'AUTH_LOG',
          targetActorOrEntity: 'dev-compromised',
          eventType: 'AUTH_FAIL_BURST',
          severity: 'MEDIUM',
          details: {},
          timestamp: '2026-08-19T21:00:00Z',
        },
      ],
      summary: 'Test summary',
      mitreTactics: [],
      recommendedMitigations: [],
    };

    const timeline = TimelineSynthesizer.synthesize(incident);
    expect(timeline).toHaveLength(2);
    expect(timeline[0].rawSignalId).toBe('sig-a');
    expect(timeline[1].rawSignalId).toBe('sig-b');
    expect(timeline[0].sequenceNumber).toBe(1);
    expect(timeline[1].sequenceNumber).toBe(2);
  });
});
