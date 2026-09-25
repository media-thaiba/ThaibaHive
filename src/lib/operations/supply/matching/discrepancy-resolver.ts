import { ThreeWayMatchEvaluationResult, DebitMemoItem } from './matching-types';
import { DebitMemoGenerator } from './debit-memo-generator';

export interface DiscrepancyResolutionAction {
  actionType: 'approve_override' | 'generate_debit_memo' | 'reject_invoice' | 'request_revised_invoice';
  actorUserId: string;
  justification: string;
  appliedDeductionUsd?: number;
}

export interface DiscrepancyResolutionResult {
  success: boolean;
  resolutionStatus: 'override_approved' | 'debit_memo_issued' | 'invoice_rejected' | 'pending_vendor_action';
  paymentVoucherCode?: string;
  debitMemo?: DebitMemoItem | null;
  auditTrailRecord: string;
}

export class DiscrepancyResolver {
  private static instance: DiscrepancyResolver;

  public static getInstance(): DiscrepancyResolver {
    if (!DiscrepancyResolver.instance) {
      DiscrepancyResolver.instance = new DiscrepancyResolver();
    }
    return DiscrepancyResolver.instance;
  }

  public resolveDiscrepancy(
    matchEvaluation: ThreeWayMatchEvaluationResult,
    vendorId: string,
    action: DiscrepancyResolutionAction,
    institutionId = 'global'
  ): DiscrepancyResolutionResult {
    if (action.actionType === 'approve_override') {
      const voucherCode = `VOUCHER-OVERRIDE-${Date.now().toString().slice(-6)}`;
      return {
        success: true,
        resolutionStatus: 'override_approved',
        paymentVoucherCode: voucherCode,
        auditTrailRecord: `Variance of $${matchEvaluation.totalDollarVarianceUsd} overridden and approved by ${action.actorUserId}. Reason: ${action.justification}`,
      };
    }

    if (action.actionType === 'generate_debit_memo') {
      const debitMemo = DebitMemoGenerator.generateDebitMemo(vendorId, matchEvaluation, institutionId);
      const voucherCode = `VOUCHER-PARTIAL-${Date.now().toString().slice(-6)}`;
      return {
        success: true,
        resolutionStatus: 'debit_memo_issued',
        paymentVoucherCode: voucherCode,
        debitMemo,
        auditTrailRecord: `Debit Memo ${debitMemo?.memoNumber} issued for deduction of $${debitMemo?.deductionAmountUsd}. Clean balance cleared for payment.`,
      };
    }

    if (action.actionType === 'reject_invoice') {
      return {
        success: true,
        resolutionStatus: 'invoice_rejected',
        auditTrailRecord: `Invoice rejected by ${action.actorUserId}. Reason: ${action.justification}`,
      };
    }

    return {
      success: true,
      resolutionStatus: 'pending_vendor_action',
      auditTrailRecord: `Requested revised invoice from vendor. Reason: ${action.justification}`,
    };
  }
}
