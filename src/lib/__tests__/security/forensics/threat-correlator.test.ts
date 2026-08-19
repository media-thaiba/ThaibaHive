import { ThreatCorrelator } from '@/lib/security/forensics/threat-correlator';
import { RawSecuritySignal } from '@/lib/security/forensics/forensic-types';

describe('ThreatCorrelator', () => {
  it('correlates multi-layer signals for an actor into a structured incident', () => {
    const signals: RawSecuritySignal[] = [
      {
        id: 'sig-1',
        sourceLayer: 'AUTH_LOG',
        targetActorOrEntity: '198.51.100.42',
        eventType: 'AUTH_FAIL_BURST',
        severity: 'HIGH',
        details: { count: 12 },
        timestamp: '2026-08-19T21:00:00Z',
      },
      {
        id: 'sig-2',
        sourceLayer: 'DEVICE_TRUST',
        targetActorOrEntity: '198.51.100.42',
        eventType: 'TRUST_DROP_UNTRUSTED',
        severity: 'CRITICAL',
        details: { newScore: 10 },
        timestamp: '2026-08-19T21:02:00Z',
      },
      {
        id: 'sig-3',
        sourceLayer: 'MICRO_SEGMENTATION',
        targetActorOrEntity: '198.51.100.42',
        eventType: 'SEGMENTATION_QUARANTINE_APPLIED',
        severity: 'CRITICAL',
        details: { vlan: 99 },
        timestamp: '2026-08-19T21:03:00Z',
      },
    ];

    const incidents = ThreatCorrelator.correlate(signals);
    expect(incidents).toHaveLength(1);
    expect(incidents[0].primaryActor).toBe('198.51.100.42');
    expect(incidents[0].attackStagesDetected).toContain('CREDENTIAL_ACCESS');
    expect(incidents[0].attackStagesDetected).toContain('DEFENSE_EVASION');
    expect(incidents[0].confidenceScore).toBeGreaterThanOrEqual(80);
  });
});
