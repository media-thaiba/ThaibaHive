import { HumanApprovalController } from '@/lib/operations/marl/human-approval-controller';
import { AgentAction } from '@/lib/operations/marl/marl-types';

describe('AIMS-003 — HumanApprovalController', () => {
  it('should manage pending approval lifecycle and execute decisions', () => {
    const controller = new HumanApprovalController();
    const action: AgentAction = {
      id: 'act_scale',
      agentId: 'cloud_agent',
      domain: 'cloud_cost',
      actionType: 'downscale_cluster',
      actionVector: [-0.5],
      parameters: { nodeCountDelta: -4, estimatedCostDeltaDollars: -650 },
      confidence: 0.92,
      expectedReward: 0.75,
      status: 'proposed',
      safetyScore: 0.88,
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    };

    const pending = controller.submitForApproval(action, 'Scale down non-prod cluster by 4 nodes', 'HIGH');
    expect(pending.status).toBe('PENDING');
    expect(controller.getPendingDecisions().length).toBe(1);

    const approved = controller.approveDecision(pending.id, 'admin_user_99');
    expect(approved?.status).toBe('APPROVED');
    expect(approved?.action.status).toBe('approved');
    expect(approved?.decidedBy).toBe('admin_user_99');
  });

  it('should abort all pending approvals immediately on emergency kill switch trigger', () => {
    const controller = new HumanApprovalController();
    const action: AgentAction = {
      id: 'act_fleet',
      agentId: 'fleet_agent',
      domain: 'fleet_logistics',
      actionType: 'emergency_reroute',
      actionVector: [0.1],
      parameters: {},
      confidence: 0.9,
      expectedReward: 0.5,
      status: 'proposed',
      safetyScore: 0.9,
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    };

    controller.submitForApproval(action, 'Special reroute during storm');
    expect(controller.getPendingDecisions().length).toBe(1);

    const result = controller.triggerEmergencyKillSwitch();
    expect(result.abortedCount).toBe(1);
    expect(controller.isEmergencyOverrideActive()).toBe(true);

    controller.resetEmergencyOverride();
    expect(controller.isEmergencyOverrideActive()).toBe(false);
  });
});
