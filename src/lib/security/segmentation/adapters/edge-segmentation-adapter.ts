/**
 * Edge Gateway Segmentation Adapter
 * Sprint-041 (ZASM)
 */

import { NetworkSegmentationAdapter, CompiledNetworkAcl } from '../segmentation-types';

export class EdgeSegmentationAdapter implements NetworkSegmentationAdapter {
  public name = 'edge-segmentation-adapter';
  private activeEdgeRules: Map<string, CompiledNetworkAcl> = new Map();

  public async applyPolicy(rules: CompiledNetworkAcl[]): Promise<{
    success: boolean;
    rulesApplied: number;
    details?: any;
  }> {
    for (const rule of rules) {
      this.activeEdgeRules.set(rule.ruleId, rule);
    }

    return {
      success: true,
      rulesApplied: rules.length,
      details: {
        target: 'Edge Application Gateway',
        isolatedServices: Array.from(new Set(rules.map((r) => r.destServicePattern))),
      },
    };
  }

  public async revertPolicy(ruleIds: string[]): Promise<{
    success: boolean;
    rulesReverted: number;
  }> {
    let count = 0;
    for (const id of ruleIds) {
      if (this.activeEdgeRules.delete(id)) {
        count++;
      }
    }
    return {
      success: true,
      rulesReverted: count,
    };
  }

  public getActiveRules(): CompiledNetworkAcl[] {
    return Array.from(this.activeEdgeRules.values());
  }
}
