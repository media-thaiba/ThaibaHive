import { RequisitionRoutingEngine } from '../../../operations/supply/workflow/requisition-routing-engine';
import { ApprovalChainManager } from '../../../operations/supply/workflow/approval-chain-manager';
import { SupplyPurchaseRequisitionItem } from '../../../operations/supply/supply-types';

describe('RequisitionRoutingEngine (SUPPLY-003)', () => {
  let engine: RequisitionRoutingEngine;
  let chainManager: ApprovalChainManager;

  beforeEach(() => {
    engine = RequisitionRoutingEngine.getInstance();
    chainManager = ApprovalChainManager.getInstance();
  });

  it('should route under $1000 requisitions to auto-approve tier', () => {
    const req: SupplyPurchaseRequisitionItem = {
      id: 'req-small',
      requisitionNumber: 'REQ-001',
      departmentId: 'dept-eng',
      requesterId: 'staff-1',
      sourceType: 'manual',
      title: 'Lab stationery',
      urgency: 'standard',
      estimatedTotalUsd: 450.0,
      budgetCode: 'BUDGET-ENG',
      currentApprovalTier: 'auto',
      status: 'draft',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const decision = engine.evaluateRouting(req);
    expect(decision.determinedTier).toBe('auto');
    expect(decision.isAutoApproved).toBe(true);
  });

  it('should route high-value requisitions ($10,000 - $50,000) to Principal tier with delegated approver resolution', () => {
    chainManager.registerDelegation({
      primaryApproverId: 'hod-1',
      delegateApproverId: 'hod-delegate-99',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      isActive: true,
    });

    const req: SupplyPurchaseRequisitionItem = {
      id: 'req-high',
      requisitionNumber: 'REQ-002',
      departmentId: 'dept-cs',
      requesterId: 'staff-2',
      sourceType: 'manual',
      title: 'High-Density GPU Chassis Expansion',
      urgency: 'expedited',
      estimatedTotalUsd: 25000.0,
      budgetCode: 'BUDGET-CS',
      currentApprovalTier: 'principal',
      status: 'pending_approval',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const decision = engine.evaluateRouting(req, 'hod-1');
    expect(decision.determinedTier).toBe('principal');
    expect(decision.assignedApproverId).toBe('hod-delegate-99');
    expect(decision.isAutoApproved).toBe(false);
  });

  it('should enforce segregation of duties preventing requester from self-approving', () => {
    const req: SupplyPurchaseRequisitionItem = {
      id: 'req-self',
      requisitionNumber: 'REQ-003',
      departmentId: 'dept-cs',
      requesterId: 'user-alice',
      sourceType: 'manual',
      title: 'Monitors',
      urgency: 'standard',
      estimatedTotalUsd: 2000.0,
      budgetCode: 'BUDGET-CS',
      currentApprovalTier: 'hod',
      status: 'pending_approval',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = engine.processApprovalAction(req, {
      requisitionId: 'req-self',
      actorUserId: 'user-alice',
      actorRole: 'hod',
      action: 'approve',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Segregation of duties violation');
  });
});
