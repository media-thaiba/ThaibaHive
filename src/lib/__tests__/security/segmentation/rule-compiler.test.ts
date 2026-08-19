import { RuleCompiler } from '@/lib/security/segmentation/rule-compiler';
import { SegmentationPolicyRule } from '@/lib/security/segmentation/segmentation-types';

describe('RuleCompiler', () => {
  it('compiles high-level policy into concrete ACLs', () => {
    const policy: SegmentationPolicyRule = {
      id: 'rule-finance-access',
      name: 'Finance Access Rule',
      priority: 50,
      action: 'ALLOW',
      targetTrustTiers: ['HIGH_TRUST'],
      sourceSubnets: ['10.0.1.0/24'],
      destServices: ['finance-service'],
      protocols: ['TCP'],
      destPorts: [443, 8443],
      vlanTag: 10,
      enabled: true,
    };

    const acls = RuleCompiler.compileRule(policy);
    expect(acls).toHaveLength(2); // 1 subnet * 1 service * 1 proto * 2 ports
    expect(acls[0].action).toBe('ALLOW');
    expect(acls[0].portPattern).toBe('443');
    expect(acls[1].portPattern).toBe('8443');
    expect(acls[0].vlanAssignment).toBe(10);
  });

  it('returns empty array if policy is disabled', () => {
    const policy: SegmentationPolicyRule = {
      id: 'disabled-rule',
      name: 'Disabled',
      priority: 100,
      action: 'DENY',
      targetTrustTiers: ['UNTRUSTED'],
      enabled: false,
    };

    const acls = RuleCompiler.compileRule(policy);
    expect(acls).toHaveLength(0);
  });
});
