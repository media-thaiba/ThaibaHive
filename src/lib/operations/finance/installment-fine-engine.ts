import { FeeDbStore } from '../../../db/fee-store';
import { FeeInstallmentItem, InstallmentStatus } from './types';

export type InstallmentPlanType = 'lump_sum' | 'semesterly' | 'quarterly' | 'monthly' | 'custom';

export interface CustomInstallmentSplit {
  percentage: number;
  dueDate: string;
  title?: string;
  gracePeriodDays?: number;
}

export type FineCalculationMode = 'flat_daily' | 'percentage_monthly' | 'stepped_slab';

export interface LateFinePolicy {
  mode: FineCalculationMode;
  gracePeriodDays: number;
  flatDailyRate?: number; // e.g. 50 INR/day
  monthlyPercentageRate?: number; // e.g. 2% per month
  maxFineCeiling?: number; // e.g. max 5000 INR
  slabs?: Array<{
    minDays: number;
    maxDays: number;
    fixedFine: number;
  }>;
}

export const DEFAULT_FINE_POLICY: LateFinePolicy = {
  mode: 'flat_daily',
  gracePeriodDays: 7,
  flatDailyRate: 50,
  maxFineCeiling: 5000,
  slabs: [
    { minDays: 1, maxDays: 15, fixedFine: 500 },
    { minDays: 16, maxDays: 30, fixedFine: 1500 },
    { minDays: 31, maxDays: 9999, fixedFine: 3000 },
  ],
};

export class InstallmentFineEngine {
  private store: FeeDbStore;

  constructor(store?: FeeDbStore) {
    this.store = store || FeeDbStore.getInstance();
  }

  /**
   * Generates a balanced installment schedule based on chosen plan
   */
  public generateInstallments(
    allocationId: string,
    netPayableAmount: number,
    planType: InstallmentPlanType,
    customSplits?: CustomInstallmentSplit[],
    startDateString: string = new Date().toISOString()
  ): FeeInstallmentItem[] {
    const startDate = new Date(startDateString);
    const installments: FeeInstallmentItem[] = [];

    if (planType === 'lump_sum') {
      const dueDate = new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      installments.push({
        id: `inst_${Date.now()}_1`,
        allocationId,
        installmentNumber: 1,
        title: 'Full Lump-Sum Fee',
        dueDate,
        gracePeriodDays: 7,
        amount: netPayableAmount,
        paidAmount: 0,
        balanceAmount: netPayableAmount,
        fineAmount: 0,
        fineWaivedAmount: 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return installments;
    }

    if (planType === 'semesterly') {
      const split1 = Math.round(netPayableAmount * 0.5 * 100) / 100;
      const split2 = Math.round((netPayableAmount - split1) * 100) / 100;

      const date1 = new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const date2 = new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      installments.push(
        {
          id: `inst_${Date.now()}_1`,
          allocationId,
          installmentNumber: 1,
          title: 'Term 1 / Semester 1 Fee',
          dueDate: date1,
          gracePeriodDays: 7,
          amount: split1,
          paidAmount: 0,
          balanceAmount: split1,
          fineAmount: 0,
          fineWaivedAmount: 0,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `inst_${Date.now()}_2`,
          allocationId,
          installmentNumber: 2,
          title: 'Term 2 / Semester 2 Fee',
          dueDate: date2,
          gracePeriodDays: 7,
          amount: split2,
          paidAmount: 0,
          balanceAmount: split2,
          fineAmount: 0,
          fineWaivedAmount: 0,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
      return installments;
    }

    if (planType === 'quarterly') {
      const numSplits = 4;
      const baseSplit = Math.floor((netPayableAmount / numSplits) * 100) / 100;
      let runningSum = 0;

      for (let i = 1; i <= numSplits; i++) {
        const isLast = i === numSplits;
        const amount = isLast ? Math.round((netPayableAmount - runningSum) * 100) / 100 : baseSplit;
        runningSum += amount;

        const daysOffset = (i - 1) * 90 + 15;
        const dueDate = new Date(startDate.getTime() + daysOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        installments.push({
          id: `inst_${Date.now()}_${i}`,
          allocationId,
          installmentNumber: i,
          title: `Quarter ${i} Installment`,
          dueDate,
          gracePeriodDays: 7,
          amount,
          paidAmount: 0,
          balanceAmount: amount,
          fineAmount: 0,
          fineWaivedAmount: 0,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      return installments;
    }

    if (planType === 'custom' && customSplits && customSplits.length > 0) {
      let runningTotal = 0;
      customSplits.forEach((split, idx) => {
        const isLast = idx === customSplits.length - 1;
        const amount = isLast
          ? Math.round((netPayableAmount - runningTotal) * 100) / 100
          : Math.round(((netPayableAmount * split.percentage) / 100) * 100) / 100;
        runningTotal += amount;

        installments.push({
          id: `inst_${Date.now()}_${idx + 1}`,
          allocationId,
          installmentNumber: idx + 1,
          title: split.title || `Custom Installment ${idx + 1}`,
          dueDate: split.dueDate,
          gracePeriodDays: split.gracePeriodDays ?? 7,
          amount,
          paidAmount: 0,
          balanceAmount: amount,
          fineAmount: 0,
          fineWaivedAmount: 0,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      return installments;
    }

    return installments;
  }

  /**
   * Computes overdue days and calculated late fine for an installment
   */
  public calculateLateFine(
    installment: FeeInstallmentItem,
    asOfDateString?: string,
    policy: LateFinePolicy = DEFAULT_FINE_POLICY
  ): {
    overdueDays: number;
    effectiveFine: number;
    grossFine: number;
    isOverdue: boolean;
  } {
    if (installment.balanceAmount <= 0) {
      return { overdueDays: 0, effectiveFine: 0, grossFine: 0, isOverdue: false };
    }

    const asOfDate = asOfDateString ? new Date(asOfDateString) : new Date();
    const dueDate = new Date(installment.dueDate);

    const diffTime = asOfDate.getTime() - dueDate.getTime();
    const totalDaysPastDue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (totalDaysPastDue <= (installment.gracePeriodDays ?? policy.gracePeriodDays)) {
      return { overdueDays: 0, effectiveFine: 0, grossFine: 0, isOverdue: false };
    }

    const billableOverdueDays = totalDaysPastDue - (installment.gracePeriodDays ?? policy.gracePeriodDays);
    let grossFine = 0;

    switch (policy.mode) {
      case 'flat_daily':
        grossFine = billableOverdueDays * (policy.flatDailyRate || 50);
        break;

      case 'percentage_monthly': {
        const monthlyRate = (policy.monthlyPercentageRate || 2) / 100;
        const months = billableOverdueDays / 30;
        grossFine = installment.balanceAmount * monthlyRate * months;
        break;
      }

      case 'stepped_slab': {
        const slabs = policy.slabs || DEFAULT_FINE_POLICY.slabs!;
        for (const slab of slabs) {
          if (billableOverdueDays >= slab.minDays && billableOverdueDays <= slab.maxDays) {
            grossFine = slab.fixedFine;
            break;
          }
        }
        if (grossFine === 0 && slabs.length > 0) {
          grossFine = slabs[slabs.length - 1].fixedFine;
        }
        break;
      }
    }

    if (policy.maxFineCeiling && grossFine > policy.maxFineCeiling) {
      grossFine = policy.maxFineCeiling;
    }

    grossFine = Math.round(grossFine * 100) / 100;
    const effectiveFine = Math.max(0, grossFine - (installment.fineWaivedAmount || 0));

    return {
      overdueDays: billableOverdueDays,
      effectiveFine,
      grossFine,
      isOverdue: true,
    };
  }

  /**
   * Applies an administrative fine waiver to an installment
   */
  public async applyFineWaiver(
    installmentId: string,
    waiverAmount: number,
    _reason: string,
    _authorizedStaffId: string
  ): Promise<FeeInstallmentItem | null> {
    const installment = this.store['memoryStore']?.installments.get(installmentId);
    if (!installment) return null;

    const currentFine = installment.fineAmount || 0;
    const newWaived = Math.min(currentFine, (installment.fineWaivedAmount || 0) + waiverAmount);
    const newFine = Math.max(0, currentFine - waiverAmount);

    return this.store.updateInstallment(installmentId, {
      fineAmount: newFine,
      fineWaivedAmount: newWaived,
    });
  }

  /**
   * Allocates payments sequentially across installments
   */
  public allocatePaymentAcrossInstallments(
    installments: FeeInstallmentItem[],
    paymentAmount: number
  ): Array<{ installmentId: string; appliedAmount: number; updatedStatus: InstallmentStatus }> {
    let remainingPayment = paymentAmount;
    const sorted = [...installments].sort((a, b) => a.installmentNumber - b.installmentNumber);
    const results: Array<{ installmentId: string; appliedAmount: number; updatedStatus: InstallmentStatus }> = [];

    for (const inst of sorted) {
      if (remainingPayment <= 0) break;
      if (inst.balanceAmount <= 0) continue;

      const toPay = Math.min(remainingPayment, inst.balanceAmount);
      remainingPayment -= toPay;
      const newBal = inst.balanceAmount - toPay;
      const status: InstallmentStatus = newBal === 0 ? 'paid' : 'partially_paid';

      results.push({
        installmentId: inst.id,
        appliedAmount: toPay,
        updatedStatus: status,
      });
    }

    return results;
  }
}
