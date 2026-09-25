import { SupplyPurchaseRequisitionItem } from '../supply-types';
import { ApprovalChainManager } from './approval-chain-manager';
import {
  RequisitionRoutingDecision,
  ApprovalActionPayload,
  ApprovalActionResult,
} from './workflow-types';

export class RequisitionRoutingEngine {
  private static instance: RequisitionRoutingEngine;
  private chainManager: ApprovalChainManager;

  private constructor() {
    this.chainManager = ApprovalChainManager.getInstance();
  }

  public static getInstance(): RequisitionRoutingEngine {
    if (!RequisitionRoutingEngine.instance) {
      RequisitionRoutingEngine.instance = new RequisitionRoutingEngine();
    }
    return RequisitionRoutingEngine.instance;
  }

  public evaluateRouting(
    requisition: SupplyPurchaseRequisitionItem,
    departmentHodUserId?: string
  ): RequisitionRoutingDecision {
    const tier = this.chainManager.determineTier(requisition.estimatedTotalUsd);
    const rule = this.chainManager.getRuleForTier(tier);
    const isAutoApproved = tier === 'auto';
    const slaDueTimestamp = this.chainManager.calculateSlaDeadline(
      requisition.urgency,
      rule.slaHours
    );

    let assignedApproverId: string | undefined = undefined;
    if (departmentHodUserId) {
      assignedApproverId = this.chainManager.resolveEffectiveApprover(departmentHodUserId);
    }

    return {
      requisitionId: requisition.id,
      totalAmountUsd: requisition.estimatedTotalUsd,
      urgency: requisition.urgency,
      determinedTier: tier,
      targetApproverRole: rule.requiredRole,
      assignedApproverId,
      isAutoApproved,
      slaDueTimestamp,
      routingNotes: isAutoApproved
        ? 'Auto-approved by policy under $1,000 threshold'
        : `Routed to ${tier.toUpperCase()} for approval under SLA ${rule.slaHours}h`,
    };
  }

  public processApprovalAction(
    requisition: SupplyPurchaseRequisitionItem,
    payload: ApprovalActionPayload
  ): ApprovalActionResult {
    // Segregation of duties check: Requester cannot approve own requisition
    if (payload.action === 'approve' && requisition.requesterId === payload.actorUserId) {
      return {
        success: false,
        previousStatus: requisition.status,
        newStatus: requisition.status,
        error: 'Segregation of duties violation: Requester cannot approve their own requisition',
      };
    }

    if (payload.action === 'reject') {
      return {
        success: true,
        previousStatus: requisition.status,
        newStatus: 'rejected',
        rejectionReason: payload.comments || 'Requisition rejected by reviewer',
      };
    }

    if (payload.action === 'escalate') {
      const nextTierMap: Record<string, any> = {
        hod: 'principal',
        principal: 'cfo_board',
      };
      const nextTier = nextTierMap[requisition.currentApprovalTier] || 'cfo_board';
      return {
        success: true,
        previousStatus: requisition.status,
        newStatus: 'pending_approval',
        nextTier,
      };
    }

    // Default Approve
    return {
      success: true,
      previousStatus: requisition.status,
      newStatus: 'approved',
      approvedAt: new Date().toISOString(),
    };
  }
}
