import { ContractLifecycleManager } from '../../../operations/supply/contracts/contract-lifecycle-manager';
import { MilestoneTracker } from '../../../operations/supply/contracts/milestone-tracker';
import { SupplyContractItem, SupplyContractMilestoneItem } from '../../../operations/supply/supply-types';

describe('ContractLifecycleManager & Milestones (SUPPLY-009)', () => {
  let engine: ContractLifecycleManager;

  beforeEach(() => {
    engine = ContractLifecycleManager.getInstance();
  });

  it('should emit renewal notice at 60-day threshold before expiration', () => {
    const targetDate = new Date('2026-10-01');
    const contract: SupplyContractItem = {
      id: 'cnt-1',
      contractCode: 'MSA-APEX-2025',
      vendorId: 'ven-apex',
      title: 'Datacenter Server Maintenance MSA',
      contractType: 'MSA',
      totalValueUsd: 120000.0,
      effectiveStartDate: '2025-10-01',
      effectiveEndDate: '2026-11-20', // ~50 days remaining from targetDate
      renewalNoticeDays: 60,
      slaUptimeTargetPercent: 99.9,
      slaPenaltyRatePerOutageHourUsd: 500.0,
      status: 'active',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const alert = engine.evaluateRenewalAlert(contract, targetDate);
    expect(alert).not.toBeNull();
    expect(alert?.alertLevel).toBe('60_day_notice');
    expect(alert?.daysRemaining).toBe(50);
  });

  it('should accurately calculate SLA downtime penalty deductions', () => {
    const contract: SupplyContractItem = {
      id: 'cnt-sla',
      contractCode: 'SLA-NET-2026',
      vendorId: 'ven-isp',
      title: 'Fiber Internet Uplink SLA',
      contractType: 'SLA_SERVICE',
      totalValueUsd: 60000.0,
      effectiveStartDate: '2026-01-01',
      effectiveEndDate: '2026-12-31',
      renewalNoticeDays: 60,
      slaUptimeTargetPercent: 99.9,
      slaPenaltyRatePerOutageHourUsd: 750.0,
      status: 'active',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Actual uptime: 98.5%, with 8 hours of unexcused outage
    const evaluation = engine.calculateSlaPenalty(contract, 98.5, 8);
    expect(evaluation.isSlaMet).toBe(false);
    expect(evaluation.penaltyDeductionUsd).toBe(6000.0); // 8 hours * $750/hr
  });

  it('should validate deliverable evidence requirement for high-value milestone release', () => {
    const milestoneNoEvidence: SupplyContractMilestoneItem = {
      id: 'mile-1',
      milestoneId: 'MILE-01',
      contractId: 'cnt-1',
      milestoneNumber: 1,
      title: 'Core Switch Installation',
      deliverableDescription: 'Physical hardware mount and fiber testing',
      amountUsd: 15000.0,
      dueDate: '2026-09-01',
      status: 'submitted',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
    };

    const readiness1 = MilestoneTracker.evaluateMilestoneReadiness(milestoneNoEvidence);
    expect(readiness1.canApprove).toBe(false);
    expect(readiness1.reason).toContain('requires deliverable evidence');

    const milestoneWithEvidence: SupplyContractMilestoneItem = {
      ...milestoneNoEvidence,
      deliverableEvidenceUrl: 'https://docs.institution.edu/signoffs/switch-install-proof.pdf',
    };

    const readiness2 = MilestoneTracker.evaluateMilestoneReadiness(milestoneWithEvidence);
    expect(readiness2.canApprove).toBe(true);
  });
});
