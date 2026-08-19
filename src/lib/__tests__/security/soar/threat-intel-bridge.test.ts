import { threatIntelBridge } from '@/lib/security/soar/threat-intel-bridge';
import { triggerDeduplicator } from '@/lib/security/soar/trigger-deduplicator';
import { approvalQueue } from '@/lib/security/soar/approval-queue';
import { actionRegistry } from '@/lib/security/soar/action-registry';
import { SecurityPlaybook } from '@/lib/security/soar/soar-types';

describe('ThreatIntelBridge', () => {
  const autoPlaybook: SecurityPlaybook = {
    id: 'pb-auto-quarantine',
    name: 'Auto Quarantine Playbook',
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
    steps: [
      { id: 's1', name: 'Quarantine Action', action: 'mock_quarantine' },
    ],
  };

  const manualApprovalPlaybook: SecurityPlaybook = {
    id: 'pb-subnet-contain',
    name: 'Subnet Containment Playbook',
    version: '1.0.0',
    category: 'NETWORK',
    enabled: true,
    auto_execute: true,
    min_confidence: 80,
    high_impact: true, // Requires manual approval
    triggers: [
      {
        event_type: 'SUBNET_ATTACK_DETECTED',
      },
    ],
    steps: [
      { id: 's1', name: 'Contain Subnet', action: 'mock_contain' },
    ],
  };

  beforeEach(() => {
    triggerDeduplicator.reset();
    approvalQueue.clear();
    actionRegistry.clear();
    threatIntelBridge.clearPlaybooks();
    threatIntelBridge.setPlaybooks([autoPlaybook, manualApprovalPlaybook]);

    actionRegistry.registerAction({
      name: 'mock_quarantine',
      execute: async () => ({ quarantined: true }),
    });

    actionRegistry.registerAction({
      name: 'mock_contain',
      execute: async () => ({ contained: true }),
    });
  });

  it('should auto-execute matching high-confidence threat events', async () => {
    const result = await threatIntelBridge.handleThreatEvent(
      {
        event_type: 'THREAT_INTEL_INDICATOR',
        severity: 'HIGH',
        confidence: 90,
        payload: { ip: '203.0.113.195' },
      },
      { type: 'IP', value: '203.0.113.195' }
    );

    expect(result.matched_playbooks).toBe(1);
    expect(result.auto_executed).toContain('pb-auto-quarantine');
    expect(result.queued_for_approval).toHaveLength(0);
  });

  it('should queue high-impact events for human approval', async () => {
    const result = await threatIntelBridge.handleThreatEvent(
      {
        event_type: 'SUBNET_ATTACK_DETECTED',
        severity: 'HIGH',
        confidence: 95,
        payload: { subnet: '192.168.1.0/24' },
      },
      { type: 'SUBNET', value: '192.168.1.0/24' }
    );

    expect(result.matched_playbooks).toBe(1);
    expect(result.queued_for_approval).toContain('pb-subnet-contain');
    expect(result.auto_executed).toHaveLength(0);

    const pending = approvalQueue.getPendingApprovals();
    expect(pending).toHaveLength(1);
    expect(pending[0].playbook_id).toBe('pb-subnet-contain');
  });

  it('should deduplicate rapid identical events', async () => {
    const event = {
      event_type: 'THREAT_INTEL_INDICATOR',
      severity: 'HIGH' as const,
      confidence: 90,
      payload: { ip: '198.51.100.77' },
    };
    const target = { type: 'IP' as const, value: '198.51.100.77' };

    const firstResult = await threatIntelBridge.handleThreatEvent(event, target);
    expect(firstResult.deduplicated).toBe(false);
    expect(firstResult.auto_executed).toContain('pb-auto-quarantine');

    const secondResult = await threatIntelBridge.handleThreatEvent(event, target);
    expect(secondResult.deduplicated).toBe(true);
    expect(secondResult.matched_playbooks).toBe(0);
  });
});
