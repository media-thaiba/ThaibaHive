/**
 * Contract & Milestone Lifecycle Types
 * SUPPLY-HIVE / ProcurementOS (Sprint-054)
 */

export interface ContractRenewalAlert {
  contractId: string;
  contractCode: string;
  vendorId: string;
  title: string;
  effectiveEndDate: string;
  daysRemaining: number;
  alertLevel: '90_day_notice' | '60_day_notice' | '30_day_critical' | 'expired';
}

export interface SlaUptimeEvaluation {
  contractId: string;
  targetUptimePercent: number;
  actualUptimePercent: number;
  outageHours: number;
  isSlaMet: boolean;
  penaltyDeductionUsd: number;
}
