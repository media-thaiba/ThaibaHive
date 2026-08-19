import { ConflictResolver } from '@/lib/security/segmentation/conflict-resolver';
import { SegmentationPolicyRule } from '@/lib/security/segmentation/segmentation-types';

describe('ConflictResolver', () => {
  it('detects contradicting rules and selects the higher priority rule', () => {
    const policies: SegmentationPolicyRule[] = [
      {
        id: 'rule-allow',
        name: 'Allow Rule',
        priority: 100,
        action: 'ALLOW',
        targetTrustTiers: ['MEDIUM_TRUST'],
        enabled: true,
      },
      {
        id: 'rule-deny',
        name: 'Deny Rule',
        priority: 50, // higher priority (lower number)
        action: 'DENY',
        targetTrustTiers: ['MEDIUM_TRUST'],
        enabled: true,
      },
    ];

    const report = ConflictResolver.resolve(policies);
    expect(report.hasConflicts).toBe(true);
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts[0].winningRuleId).toBe('rule-deny');
  });

  it('selects safer action (QUARANTINE/DENY) when priorities are identical', () => {
    const policies: SegmentationPolicyRule[] = [
      {
        id: 'rule-allow-same',
        name: 'Allow Same',
        priority: 100,
        action: 'ALLOW',
        targetTrustTiers: ['LOW_TRUST'],
        enabled: true,
      },
      {
        id: 'rule-quarantine-same',
        name: 'Quarantine Same',
        priority: 100,
        action: 'QUARANTINE',
        targetTrustTiers: ['LOW_TRUST'],
        enabled: true,
      },
    ];

    const report = ConflictResolver.resolve(policies);
    expect(report.hasConflicts).toBe(true);
    expect(report.conflicts[0].winningRuleId).toBe('rule-quarantine-same');
  });
});
