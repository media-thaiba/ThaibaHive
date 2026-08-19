/**
 * Campus Switch Network Enforcement Adapter
 * Sprint-041 (ZASM)
 */

import { NetworkSegmentationAdapter, CompiledNetworkAcl } from '../segmentation-types';

export class CampusSwitchAdapter implements NetworkSegmentationAdapter {
  public name = 'campus-switch-adapter';
  private appliedAcls: Map<string, CompiledNetworkAcl> = new Map();

  public async applyPolicy(rules: CompiledNetworkAcl[]): Promise<{
    success: boolean;
    rulesApplied: number;
    details?: any;
  }> {
    for (const rule of rules) {
      this.appliedAcls.set(rule.ruleId, rule);
    }

    return {
      success: true,
      rulesApplied: rules.length,
      details: {
        target: 'Campus L3 Switch Mesh',
        vlansConfigured: Array.from(new Set(rules.map((r) => r.vlanAssignment).filter(Boolean))),
      },
    };
  }

  public async revertPolicy(ruleIds: string[]): Promise<{
    success: boolean;
    rulesReverted: number;
  }> {
    let count = 0;
    for (const id of ruleIds) {
      if (this.appliedAcls.delete(id)) {
        count++;
      }
    }
    return {
      success: true,
      rulesReverted: count,
    };
  }

  public getActiveAcls(): CompiledNetworkAcl[] {
    return Array.from(this.appliedAcls.values());
  }
}
