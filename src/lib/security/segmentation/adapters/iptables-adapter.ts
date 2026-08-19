/**
 * Host-Level iptables Packet Filtering Adapter
 * Sprint-041 (ZASM)
 */

import { NetworkSegmentationAdapter, CompiledNetworkAcl } from '../segmentation-types';

export class IptablesAdapter implements NetworkSegmentationAdapter {
  public name = 'iptables-adapter';
  private generatedCommands: string[] = [];

  public async applyPolicy(rules: CompiledNetworkAcl[]): Promise<{
    success: boolean;
    rulesApplied: number;
    details?: any;
  }> {
    const commands: string[] = [];

    for (const rule of rules) {
      const target = rule.action === 'ALLOW' ? 'ACCEPT' : 'DROP';
      const proto = rule.protocol !== 'ALL' ? `-p ${rule.protocol.toLowerCase()}` : '';
      const port = rule.portPattern !== '*' ? `--dport ${rule.portPattern}` : '';
      const src = rule.sourceIpPattern !== '0.0.0.0/0' ? `-s ${rule.sourceIpPattern}` : '';

      const cmd = `iptables -A ZASM_FORWARD ${src} ${proto} ${port} -j ${target}`.replace(/\s+/g, ' ').trim();
      commands.push(cmd);
    }

    this.generatedCommands = commands;

    return {
      success: true,
      rulesApplied: rules.length,
      details: {
        chain: 'ZASM_FORWARD',
        commandCount: commands.length,
      },
    };
  }

  public async revertPolicy(ruleIds: string[]): Promise<{
    success: boolean;
    rulesReverted: number;
  }> {
    this.generatedCommands = [];
    return {
      success: true,
      rulesReverted: ruleIds.length,
    };
  }

  public getGeneratedCommands(): string[] {
    return [...this.generatedCommands];
  }
}
