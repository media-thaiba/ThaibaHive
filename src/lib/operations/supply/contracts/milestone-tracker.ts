import { SupplyContractMilestoneItem } from '../supply-types';

export class MilestoneTracker {
  public static evaluateMilestoneReadiness(
    milestone: SupplyContractMilestoneItem
  ): {
    canApprove: boolean;
    reason: string;
  } {
    if (milestone.status === 'paid') {
      return { canApprove: false, reason: 'Milestone is already settled and paid' };
    }
    if (!milestone.deliverableEvidenceUrl && milestone.amountUsd > 5000) {
      return { canApprove: false, reason: 'High-value milestone requires deliverable evidence URL attachment' };
    }
    return { canApprove: true, reason: 'Milestone deliverable verified and eligible for sign-off' };
  }
}
