import { CampusSwitchAdapter } from '@/lib/security/segmentation/adapters/campus-switch-adapter';
import { EdgeSegmentationAdapter } from '@/lib/security/segmentation/adapters/edge-segmentation-adapter';
import { IptablesAdapter } from '@/lib/security/segmentation/adapters/iptables-adapter';
import { CompiledNetworkAcl } from '@/lib/security/segmentation/segmentation-types';

describe('NetworkSegmentationAdapters', () => {
  const sampleAcls: CompiledNetworkAcl[] = [
    {
      ruleId: 'acl-01',
      action: 'ALLOW',
      sourceIpPattern: '10.0.0.0/16',
      destServicePattern: 'academic-service',
      protocol: 'TCP',
      portPattern: '443',
      vlanAssignment: 10,
      priority: 100,
    },
    {
      ruleId: 'acl-02',
      action: 'DENY',
      sourceIpPattern: '192.168.1.100',
      destServicePattern: '*',
      protocol: 'ALL',
      portPattern: '*',
      vlanAssignment: 99,
      priority: 10,
    },
  ];

  it('CampusSwitchAdapter applies and reverts VLAN steering and ACLs', async () => {
    const adapter = new CampusSwitchAdapter();
    const result = await adapter.applyPolicy(sampleAcls);

    expect(result.success).toBe(true);
    expect(result.rulesApplied).toBe(2);
    expect(adapter.getActiveAcls()).toHaveLength(2);

    const revertResult = await adapter.revertPolicy(['acl-01']);
    expect(revertResult.rulesReverted).toBe(1);
    expect(adapter.getActiveAcls()).toHaveLength(1);
  });

  it('EdgeSegmentationAdapter manages edge routing isolation', async () => {
    const adapter = new EdgeSegmentationAdapter();
    const result = await adapter.applyPolicy(sampleAcls);

    expect(result.success).toBe(true);
    expect(adapter.getActiveRules()).toHaveLength(2);
  });

  it('IptablesAdapter generates packet filtering commands', async () => {
    const adapter = new IptablesAdapter();
    const result = await adapter.applyPolicy(sampleAcls);

    expect(result.success).toBe(true);
    const cmds = adapter.getGeneratedCommands();
    expect(cmds.length).toBe(2);
    expect(cmds[0]).toContain('iptables -A ZASM_FORWARD');
    expect(cmds[0]).toContain('ACCEPT');
    expect(cmds[1]).toContain('DROP');
  });
});
