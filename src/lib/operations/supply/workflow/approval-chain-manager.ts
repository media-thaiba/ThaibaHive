import { ApprovalTier, RequisitionUrgency } from '../supply-types';
import { ApprovalStepRule, ApproverDelegation } from './workflow-types';

export class ApprovalChainManager {
  private static instance: ApprovalChainManager;

  private rules: ApprovalStepRule[] = [
    {
      tier: 'auto',
      minAmountUsd: 0,
      maxAmountUsd: 1000,
      slaHours: 1,
      requiredRole: 'system',
    },
    {
      tier: 'hod',
      minAmountUsd: 1000,
      maxAmountUsd: 10000,
      slaHours: 48,
      requiredRole: 'hod',
    },
    {
      tier: 'principal',
      minAmountUsd: 10000,
      maxAmountUsd: 50000,
      slaHours: 72,
      requiredRole: 'principal',
    },
    {
      tier: 'cfo_board',
      minAmountUsd: 50000,
      maxAmountUsd: Infinity,
      slaHours: 96,
      requiredRole: 'cfo_board',
    },
  ];

  private delegations: Map<string, ApproverDelegation> = new Map();

  public static getInstance(): ApprovalChainManager {
    if (!ApprovalChainManager.instance) {
      ApprovalChainManager.instance = new ApprovalChainManager();
    }
    return ApprovalChainManager.instance;
  }

  public registerDelegation(delegation: ApproverDelegation): void {
    this.delegations.set(delegation.primaryApproverId, delegation);
  }

  public resolveEffectiveApprover(primaryApproverId: string): string {
    const delegation = this.delegations.get(primaryApproverId);
    if (!delegation || !delegation.isActive) {
      return primaryApproverId;
    }
    const now = new Date().toISOString();
    if (now >= delegation.startDate && now <= delegation.endDate) {
      return delegation.delegateApproverId;
    }
    return primaryApproverId;
  }

  public determineTier(amountUsd: number): ApprovalTier {
    for (const rule of this.rules) {
      if (amountUsd >= rule.minAmountUsd && amountUsd < rule.maxAmountUsd) {
        return rule.tier;
      }
    }
    return 'cfo_board';
  }

  public getRuleForTier(tier: ApprovalTier): ApprovalStepRule {
    const rule = this.rules.find((r) => r.tier === tier);
    if (!rule) {
      return this.rules[1]; // default to HOD
    }
    return rule;
  }

  public calculateSlaDeadline(urgency: RequisitionUrgency, baseSlaHours: number): string {
    let effectiveHours = baseSlaHours;
    if (urgency === 'emergency') {
      effectiveHours = Math.max(2, Math.floor(baseSlaHours * 0.1));
    } else if (urgency === 'expedited') {
      effectiveHours = Math.max(12, Math.floor(baseSlaHours * 0.5));
    }
    const deadline = new Date(Date.now() + effectiveHours * 60 * 60 * 1000);
    return deadline.toISOString();
  }
}
