import { STANDARD_GL_ACCOUNTS, resolveComponentRevenueAccount, resolvePaymentAssetAccount } from './account-mapping';
import {
  GLJournalEntry,
  FeePaymentItem,
  FeeStudentAllocationItem,
  FeeStructureItem,
  FeeConcessionItem,
} from '../types';

export class FeeGLEngine {
  /**
   * Validates that journal entries strictly satisfy the double-entry invariant: Debits == Credits
   */
  public static validateJournalBalance(entries: GLJournalEntry[]): boolean {
    if (!entries || entries.length === 0) return true;
    let debitSum = 0;
    let creditSum = 0;

    for (const e of entries) {
      if (e.debitAccount && e.amount) debitSum += Math.round(e.amount * 100);
      if (e.creditAccount && e.amount) creditSum += Math.round(e.amount * 100);
    }

    return debitSum === creditSum;
  }

  /**
   * Generates double-entry journals for student fee billing/allocation
   * Debit: Fee Receivable | Credit: Specific Component Revenues
   */
  public static generateAllocationJournals(
    allocation: FeeStudentAllocationItem,
    structure: FeeStructureItem
  ): GLJournalEntry[] {
    const entries: GLJournalEntry[] = [];
    const date = allocation.allocationDate || new Date().toISOString();
    const ref = `JRN-ALLOC-${allocation.id}`;
    const components = structure.components || [];

    if (components.length === 0) {
      entries.push({
        id: `gl_${Date.now()}_alloc_1`,
        referenceNumber: ref,
        institutionId: allocation.institutionId,
        entryDate: date,
        debitAccount: STANDARD_GL_ACCOUNTS.FEE_RECEIVABLE,
        creditAccount: STANDARD_GL_ACCOUNTS.TUITION_REVENUE,
        amount: allocation.baseAmount,
        currency: 'INR',
        narration: `Fee Allocation - Student ${allocation.studentId} - ${structure.name}`,
        entityType: 'fee_student_allocations',
        entityId: allocation.id,
        createdAt: new Date().toISOString(),
      });
      return entries;
    }

    // Proportionally distribute baseAmount across components
    const totalStructAmount = components.reduce((sum, c) => sum + c.amount, 0) || 1;

    components.forEach((comp, idx) => {
      const compAmount = Math.round(((comp.amount / totalStructAmount) * allocation.baseAmount) * 100) / 100;
      const revenueAccount = resolveComponentRevenueAccount(comp.componentType);

      entries.push({
        id: `gl_${Date.now()}_alloc_${idx + 1}`,
        referenceNumber: ref,
        institutionId: allocation.institutionId,
        entryDate: date,
        debitAccount: STANDARD_GL_ACCOUNTS.FEE_RECEIVABLE,
        creditAccount: revenueAccount,
        amount: compAmount,
        currency: 'INR',
        narration: `Fee Billing (${comp.name}) - Student ${allocation.studentId}`,
        entityType: 'fee_student_allocations',
        entityId: allocation.id,
        createdAt: new Date().toISOString(),
      });
    });

    return entries;
  }

  /**
   * Generates double-entry journals for payment collection
   * Debit: Bank/Cash/Gateway Clearing | Credit: Fee Receivable (and Late Fine Income if applicable)
   */
  public static generatePaymentJournals(payment: FeePaymentItem): GLJournalEntry[] {
    const entries: GLJournalEntry[] = [];
    const date = payment.paidAt || new Date().toISOString();
    const ref = `JRN-PAY-${payment.paymentNumber}`;
    const assetAccount = resolvePaymentAssetAccount(payment.paymentMethod);

    // Principal fee payment portion
    if (payment.amount > 0) {
      entries.push({
        id: `gl_${Date.now()}_pay_principal`,
        referenceNumber: ref,
        institutionId: payment.institutionId,
        entryDate: date,
        debitAccount: assetAccount,
        creditAccount: STANDARD_GL_ACCOUNTS.FEE_RECEIVABLE,
        amount: payment.amount,
        currency: payment.currency || 'INR',
        narration: `Fee Collection via ${payment.paymentMethod} - Ref: ${payment.paymentNumber}`,
        entityType: 'fee_payments',
        entityId: payment.id,
        createdAt: new Date().toISOString(),
      });
    }

    // Late fine collected portion
    if (payment.fineAmount > 0) {
      entries.push({
        id: `gl_${Date.now()}_pay_fine`,
        referenceNumber: ref,
        institutionId: payment.institutionId,
        entryDate: date,
        debitAccount: assetAccount,
        creditAccount: STANDARD_GL_ACCOUNTS.LATE_FINE_INCOME,
        amount: payment.fineAmount,
        currency: payment.currency || 'INR',
        narration: `Late Fine Collected - Ref: ${payment.paymentNumber}`,
        entityType: 'fee_payments',
        entityId: payment.id,
        createdAt: new Date().toISOString(),
      });
    }

    return entries;
  }

  /**
   * Generates double-entry journals for scholarship / concession approval
   * Debit: Scholarship Expense | Credit: Fee Receivable
   */
  public static generateConcessionJournals(concession: FeeConcessionItem): GLJournalEntry[] {
    const date = concession.decisionDate || new Date().toISOString();
    const ref = `JRN-CONC-${concession.id}`;

    return [
      {
        id: `gl_${Date.now()}_conc_1`,
        referenceNumber: ref,
        institutionId: concession.institutionId,
        entryDate: date,
        debitAccount: STANDARD_GL_ACCOUNTS.SCHOLARSHIP_EXPENSE,
        creditAccount: STANDARD_GL_ACCOUNTS.FEE_RECEIVABLE,
        amount: concession.amount,
        currency: 'INR',
        narration: `Scholarship Concession Approved - Student ${concession.studentId} - ${concession.reason}`,
        entityType: 'fee_concessions',
        entityId: concession.id,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Generates double-entry journals for gateway payout settlement
   * Debit: Bank Account & Gateway Fee Expense | Credit: Gateway Clearing
   */
  public static generateSettlementJournals(
    institutionId: string,
    settlementRef: string,
    netPayout: number,
    gatewayFees: number,
    totalGrossSettled: number,
    currency: string = 'INR'
  ): GLJournalEntry[] {
    const ref = `JRN-SETTLE-${settlementRef}`;
    const date = new Date().toISOString();

    const entries: GLJournalEntry[] = [
      {
        id: `gl_${Date.now()}_stl_1`,
        referenceNumber: ref,
        institutionId,
        entryDate: date,
        debitAccount: STANDARD_GL_ACCOUNTS.BANK_CASH,
        creditAccount: STANDARD_GL_ACCOUNTS.GATEWAY_CLEARING,
        amount: netPayout,
        currency,
        narration: `Gateway Net Payout Credited - Ref: ${settlementRef}`,
        entityType: 'fee_reconciliation_batches',
        entityId: settlementRef,
        createdAt: date,
      },
    ];

    if (gatewayFees > 0) {
      entries.push({
        id: `gl_${Date.now()}_stl_2`,
        referenceNumber: ref,
        institutionId,
        entryDate: date,
        debitAccount: STANDARD_GL_ACCOUNTS.GATEWAY_FEE_EXPENSE,
        creditAccount: STANDARD_GL_ACCOUNTS.GATEWAY_CLEARING,
        amount: gatewayFees,
        currency,
        narration: `Payment Gateway Fee Deducted - Ref: ${settlementRef}`,
        entityType: 'fee_reconciliation_batches',
        entityId: settlementRef,
        createdAt: date,
      });
    }

    return entries;
  }
}
