/**
 * Unit tests for PreemptiveHardeningController (ARES-004)
 */

import { PreemptiveHardeningController } from '@/lib/security/ares/preemptive-hardening';

describe('ARES-004: PreemptiveHardeningController', () => {
  beforeEach(() => {
    PreemptiveHardeningController.resetInstance();
  });

  it('should plan hardening action in APPLIED status when in autonomous mode', () => {
    const controller = PreemptiveHardeningController.getInstance();
    const action = controller.planHardeningAction(
      'CREDENTIAL_STUFFING',
      'auth-edge-gateway',
      'ENFORCE_STEP_UP_AUTH',
      'Proactive step-up auth for projected credential surge'
    );

    expect(action.status).toBe('APPLIED');
    expect(action.appliedAt).toBeDefined();
    expect(controller.getActions().length).toBe(1);
  });

  it('should allow proposing and manually applying hardening action in non-autonomous mode', () => {
    const controller = PreemptiveHardeningController.getInstance();
    controller.setAutonomousMode(false);

    const action = controller.planHardeningAction(
      'ZERO_DAY_EXPLOIT',
      'vlan-10-prod',
      'TIGHTEN_MICRO_SEGMENTATION',
      'Restrict inbound traffic to trusted identities'
    );

    expect(action.status).toBe('PROPOSED');
    expect(action.appliedAt).toBeUndefined();

    const applied = controller.applyHardeningAction(action.actionId);
    expect(applied).toBe(true);
    expect(controller.getActions()[0].status).toBe('APPLIED');

    const reverted = controller.revertHardeningAction(action.actionId);
    expect(reverted).toBe(true);
    expect(controller.getActions()[0].status).toBe('REVERTED');
  });
});
