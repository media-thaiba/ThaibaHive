/**
 * Policy Conflict Resolver
 * Sprint-041 (ZASM)
 */

import { SegmentationPolicyRule, PolicyAction } from './segmentation-types';

export interface ConflictReport {
  hasConflicts: boolean;
  conflicts: {
    ruleA: string;
    ruleB: string;
    description: string;
    winningRuleId: string;
  }[];
  resolvedPolicies: SegmentationPolicyRule[];
}

export class ConflictResolver {
  private static actionPrecedence: Record<PolicyAction, number> = {
    QUARANTINE: 4,
    DENY: 3,
    STEP_UP_AUTH: 2,
    ALLOW: 1,
  };

  /**
   * Identifies conflicts and resolves overlapping policies using strict priority and safety hierarchy
   */
  public static resolve(policies: SegmentationPolicyRule[]): ConflictReport {
    const conflicts: ConflictReport['conflicts'] = [];
    const resolved = [...policies].sort((a, b) => a.priority - b.priority);

    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        const ruleA = resolved[i];
        const ruleB = resolved[j];

        // Check if both rules target the same trust tier and have opposing actions
        const commonTiers = ruleA.targetTrustTiers.filter((t) => ruleB.targetTrustTiers.includes(t));
        if (commonTiers.length > 0 && ruleA.action !== ruleB.action) {
          // Conflict detected!
          // Lower numerical priority wins. If identical priority, safer action (e.g. QUARANTINE/DENY) wins.
          let winner = ruleA.id;
          if (ruleB.priority < ruleA.priority) {
            winner = ruleB.id;
          } else if (ruleB.priority === ruleA.priority) {
            const precA = this.actionPrecedence[ruleA.action];
            const precB = this.actionPrecedence[ruleB.action];
            winner = precB > precA ? ruleB.id : ruleA.id;
          }

          conflicts.push({
            ruleA: ruleA.id,
            ruleB: ruleB.id,
            description: `Contradicting actions (${ruleA.action} vs ${ruleB.action}) on shared tiers [${commonTiers.join(', ')}]`,
            winningRuleId: winner,
          });
        }
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      resolvedPolicies: resolved,
    };
  }
}
