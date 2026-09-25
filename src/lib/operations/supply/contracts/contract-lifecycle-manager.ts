import { SupplyContractItem } from '../supply-types';
import { ContractRenewalAlert, SlaUptimeEvaluation } from './contract-types';

export class ContractLifecycleManager {
  private static instance: ContractLifecycleManager;

  public static getInstance(): ContractLifecycleManager {
    if (!ContractLifecycleManager.instance) {
      ContractLifecycleManager.instance = new ContractLifecycleManager();
    }
    return ContractLifecycleManager.instance;
  }

  public evaluateRenewalAlert(contract: SupplyContractItem, referenceDate = new Date()): ContractRenewalAlert | null {
    const endDate = new Date(contract.effectiveEndDate);
    const diffTime = endDate.getTime() - referenceDate.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      return {
        contractId: contract.id,
        contractCode: contract.contractCode,
        vendorId: contract.vendorId,
        title: contract.title,
        effectiveEndDate: contract.effectiveEndDate,
        daysRemaining,
        alertLevel: 'expired',
      };
    }

    if (daysRemaining <= 30) {
      return {
        contractId: contract.id,
        contractCode: contract.contractCode,
        vendorId: contract.vendorId,
        title: contract.title,
        effectiveEndDate: contract.effectiveEndDate,
        daysRemaining,
        alertLevel: '30_day_critical',
      };
    }

    if (daysRemaining <= 60) {
      return {
        contractId: contract.id,
        contractCode: contract.contractCode,
        vendorId: contract.vendorId,
        title: contract.title,
        effectiveEndDate: contract.effectiveEndDate,
        daysRemaining,
        alertLevel: '60_day_notice',
      };
    }

    if (daysRemaining <= 90) {
      return {
        contractId: contract.id,
        contractCode: contract.contractCode,
        vendorId: contract.vendorId,
        title: contract.title,
        effectiveEndDate: contract.effectiveEndDate,
        daysRemaining,
        alertLevel: '90_day_notice',
      };
    }

    return null;
  }

  public calculateSlaPenalty(
    contract: SupplyContractItem,
    actualUptimePercent: number,
    outageHours: number
  ): SlaUptimeEvaluation {
    const isSlaMet = actualUptimePercent >= contract.slaUptimeTargetPercent;
    let penaltyDeductionUsd = 0.0;

    if (!isSlaMet && outageHours > 0) {
      penaltyDeductionUsd = Number((outageHours * contract.slaPenaltyRatePerOutageHourUsd).toFixed(2));
    }

    return {
      contractId: contract.id,
      targetUptimePercent: contract.slaUptimeTargetPercent,
      actualUptimePercent,
      outageHours,
      isSlaMet,
      penaltyDeductionUsd,
    };
  }
}
