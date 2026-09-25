import { FeeDbStore } from '../../../../db/fee-store';
import {
  FeeStudentAllocationItem,
  FeeInstallmentItem,
  AgingBucket,
} from '../types';

export interface StudentAgingAnalysis {
  studentId: string;
  allocationId: string;
  totalDue: number;
  oldestDueDate: string;
  daysOverdue: number;
  agingBucket: AgingBucket;
  riskScore: number; // 0 (low) to 100 (critical)
  shouldBlockHallTicket: boolean;
  shouldBlockTranscripts: boolean;
  recommendedAction: string;
}

export interface CampusAgingSummary {
  institutionId: string;
  totalReceivable: number;
  totalOverdue: number;
  currentNotDue: number;
  bucket1_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90_plus: number;
  defaulterStudentCount: number;
  criticalDefaulterCount: number;
  collectionRatePercent: number;
  analyzedAt: string;
}

export class AgingAnalyticsEngine {
  private store: FeeDbStore;

  constructor(store?: FeeDbStore) {
    this.store = store || FeeDbStore.getInstance();
  }

  /**
   * Resolves the aging bucket from the number of days overdue
   */
  public static resolveBucket(daysOverdue: number): AgingBucket {
    if (daysOverdue <= 0) return 'current';
    if (daysOverdue <= 30) return '1_30';
    if (daysOverdue <= 60) return '31_60';
    if (daysOverdue <= 90) return '61_90';
    return '90_plus';
  }

  /**
   * Computes risk score (0 - 100) based on overdue days and amount
   */
  public static calculateRiskScore(daysOverdue: number, overdueAmount: number): number {
    if (daysOverdue <= 0 || overdueAmount <= 0) return 0;

    let scoreFromDays = 0;
    if (daysOverdue <= 30) scoreFromDays = (daysOverdue / 30) * 30;
    else if (daysOverdue <= 60) scoreFromDays = 30 + ((daysOverdue - 30) / 30) * 30;
    else if (daysOverdue <= 90) scoreFromDays = 60 + ((daysOverdue - 60) / 30) * 25;
    else scoreFromDays = 85 + Math.min(15, (daysOverdue - 90) * 0.5);

    let scoreFromAmount = 0;
    if (overdueAmount > 50000) scoreFromAmount = 15;
    else if (overdueAmount > 20000) scoreFromAmount = 10;
    else scoreFromAmount = 5;

    return Math.min(100, Math.round(scoreFromDays + scoreFromAmount));
  }

  /**
   * Evaluates individual student allocation aging
   */
  public evaluateStudentAging(
    allocation: FeeStudentAllocationItem,
    asOfDateString?: string
  ): StudentAgingAnalysis {
    const asOfDate = asOfDateString ? new Date(asOfDateString) : new Date();
    const installments = allocation.installments || [];

    let maxDaysOverdue = 0;
    let oldestDue = allocation.dueDate || asOfDate.toISOString();

    for (const inst of installments) {
      if (inst.balanceAmount > 0) {
        const dueDate = new Date(inst.dueDate);
        const diffDays = Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > maxDaysOverdue) {
          maxDaysOverdue = diffDays;
          oldestDue = inst.dueDate;
        }
      }
    }

    if (installments.length === 0 && allocation.balanceAmount > 0 && allocation.dueDate) {
      const dueDate = new Date(allocation.dueDate);
      const diffDays = Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > maxDaysOverdue) {
        maxDaysOverdue = diffDays;
      }
    }

    const bucket = AgingAnalyticsEngine.resolveBucket(maxDaysOverdue);
    const riskScore = AgingAnalyticsEngine.calculateRiskScore(maxDaysOverdue, allocation.balanceAmount);

    const shouldBlockHallTicket = maxDaysOverdue >= 60;
    const shouldBlockTranscripts = maxDaysOverdue >= 90;

    let recommendedAction = 'No action required';
    if (bucket === '1_30') recommendedAction = 'Send gentle WhatsApp/SMS reminder';
    else if (bucket === '31_60') recommendedAction = 'Issue second warning notice & follow-up call';
    else if (bucket === '61_90') recommendedAction = 'Hold examination hall ticket & guardian meeting';
    else if (bucket === '90_plus') recommendedAction = 'Escalate to Principal for financial intervention';

    return {
      studentId: allocation.studentId,
      allocationId: allocation.id,
      totalDue: allocation.balanceAmount,
      oldestDueDate: oldestDue,
      daysOverdue: maxDaysOverdue,
      agingBucket: bucket,
      riskScore,
      shouldBlockHallTicket,
      shouldBlockTranscripts,
      recommendedAction,
    };
  }

  /**
   * Generates consolidated multi-bucket campus aging analytics summary
   */
  public async getCampusAgingSummary(
    institutionId: string,
    asOfDateString?: string
  ): Promise<CampusAgingSummary> {
    const allocations = await this.store.listAllocations(institutionId);

    let totalReceivable = 0;
    let totalOverdue = 0;
    let currentNotDue = 0;
    let b1_30 = 0;
    let b31_60 = 0;
    let b61_90 = 0;
    let b90_plus = 0;
    let defaulterCount = 0;
    let criticalCount = 0;

    let totalBilled = 0;
    let totalPaid = 0;

    for (const alloc of allocations) {
      totalBilled += alloc.netPayableAmount;
      totalPaid += alloc.paidAmount;
      totalReceivable += alloc.balanceAmount;

      if (alloc.balanceAmount > 0) {
        const analysis = this.evaluateStudentAging(alloc, asOfDateString);
        if (analysis.agingBucket === 'current') {
          currentNotDue += alloc.balanceAmount;
        } else {
          totalOverdue += alloc.balanceAmount;
          defaulterCount++;

          if (analysis.agingBucket === '1_30') b1_30 += alloc.balanceAmount;
          else if (analysis.agingBucket === '31_60') b31_60 += alloc.balanceAmount;
          else if (analysis.agingBucket === '61_90') b61_90 += alloc.balanceAmount;
          else if (analysis.agingBucket === '90_plus') {
            b90_plus += alloc.balanceAmount;
            criticalCount++;
          }
        }
      }
    }

    const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 10000) / 100 : 100;

    return {
      institutionId,
      totalReceivable,
      totalOverdue,
      currentNotDue,
      bucket1_30: b1_30,
      bucket31_60: b31_60,
      bucket61_90: b61_90,
      bucket90_plus: b90_plus,
      defaulterStudentCount: defaulterCount,
      criticalDefaulterCount: criticalCount,
      collectionRatePercent: collectionRate,
      analyzedAt: new Date().toISOString(),
    };
  }
}
