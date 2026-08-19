import { TriggerMatcher, SoarIncomingEvent } from '@/lib/security/soar/trigger-matcher';
import { SecurityPlaybook } from '@/lib/security/soar/soar-types';

describe('TriggerMatcher', () => {
  const playbooks: SecurityPlaybook[] = [
    {
      id: 'pb-ip-quarantine',
      name: 'IP Quarantine Mitigation',
      version: '1.0.0',
      category: 'NETWORK',
      enabled: true,
      auto_execute: true,
      min_confidence: 80,
      triggers: [
        {
          event_type: 'THREAT_INTEL_INDICATOR',
          severity: 'HIGH',
          confidence_min: 80,
        },
      ],
      steps: [],
    },
    {
      id: 'pb-geo-block',
      name: 'High Risk Geo Block',
      version: '1.0.0',
      category: 'NETWORK',
      enabled: true,
      auto_execute: true,
      min_confidence: 70,
      triggers: [
        {
          event_type: 'SUSPICIOUS_GEO_LOGIN',
          condition: {
            field: 'country',
            operator: 'in',
            value: ['XX', 'ZZ'],
          },
        },
      ],
      steps: [],
    },
    {
      id: 'pb-disabled',
      name: 'Disabled Playbook',
      version: '1.0.0',
      category: 'SYSTEM',
      enabled: false,
      auto_execute: false,
      min_confidence: 0,
      triggers: [{ event_type: '*' }],
      steps: [],
    },
  ];

  it('should match high confidence threat intel events', () => {
    const event: SoarIncomingEvent = {
      event_type: 'THREAT_INTEL_INDICATOR',
      severity: 'HIGH',
      confidence: 85,
      payload: { ip: '1.2.3.4' },
    };

    const matches = TriggerMatcher.findMatchingPlaybooks(event, playbooks);
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('pb-ip-quarantine');
  });

  it('should not match when confidence is below minimum', () => {
    const event: SoarIncomingEvent = {
      event_type: 'THREAT_INTEL_INDICATOR',
      severity: 'HIGH',
      confidence: 65, // Below 80
      payload: { ip: '1.2.3.4' },
    };

    const matches = TriggerMatcher.findMatchingPlaybooks(event, playbooks);
    expect(matches).toHaveLength(0);
  });

  it('should evaluate custom condition in trigger', () => {
    const matchingEvent: SoarIncomingEvent = {
      event_type: 'SUSPICIOUS_GEO_LOGIN',
      payload: { country: 'XX', user_id: 'u1' },
    };
    const nonMatchingEvent: SoarIncomingEvent = {
      event_type: 'SUSPICIOUS_GEO_LOGIN',
      payload: { country: 'US', user_id: 'u2' },
    };

    expect(TriggerMatcher.findMatchingPlaybooks(matchingEvent, playbooks)).toHaveLength(1);
    expect(TriggerMatcher.findMatchingPlaybooks(nonMatchingEvent, playbooks)).toHaveLength(0);
  });

  it('should ignore disabled playbooks even on wildcard triggers', () => {
    const event: SoarIncomingEvent = {
      event_type: 'ANY_UNMATCHED_EVENT',
      payload: {},
    };
    expect(TriggerMatcher.findMatchingPlaybooks(event, playbooks)).toHaveLength(0);
  });
});
