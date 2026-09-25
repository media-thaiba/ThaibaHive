/**
 * Requisition & Approval Workflow Types
 * SUPPLY-HIVE / ProcurementOS (Sprint-054)
 */

import { ApprovalTier, RequisitionUrgency, RequisitionStatus } from '../supply-types';

export interface ApprovalStepRule {
  tier: ApprovalTier;
  minAmountUsd: number;
  maxAmountUsd: number;
  slaHours: number;
  requiredRole: string;
}

export interface ApproverDelegation {
  primaryApproverId: string;
  delegateApproverId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface RequisitionRoutingDecision {
  requisitionId: string;
  totalAmountUsd: number;
  urgency: RequisitionUrgency;
  determinedTier: ApprovalTier;
  targetApproverRole: string;
  assignedApproverId?: string;
  isAutoApproved: boolean;
  slaDueTimestamp: string;
  routingNotes: string;
}

export interface ApprovalActionPayload {
  requisitionId: string;
  actorUserId: string;
  actorRole: string;
  action: 'approve' | 'reject' | 'escalate';
  comments?: string;
}

export interface ApprovalActionResult {
  success: boolean;
  previousStatus: RequisitionStatus;
  newStatus: RequisitionStatus;
  nextTier?: ApprovalTier;
  rejectionReason?: string;
  approvedAt?: string;
  error?: string;
}
