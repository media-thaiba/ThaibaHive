import { OperationalGuardrails } from '@/lib/operations/marl/operational-guardrails';
import { AgentAction } from '@/lib/operations/marl/marl-types';

describe('AIMS-003 — OperationalGuardrails', () => {
  it('should clamp unsafe HVAC setpoints to configured temperature envelope', () => {
    const guardrails = new OperationalGuardrails({ minTempCelsius: 20.0, maxTempCelsius: 26.0 });

    const unsafeCoolingAction: AgentAction = {
      id: 'act_cool',
      agentId: 'hvac_agent',
      domain: 'hvac_energy',
      actionType: 'optimize_hvac',
      actionVector: [-1.0],
      parameters: { setpointAdjustment: -6.0 }, // 23 - 6 = 17 C (Below 20 C)
      confidence: 0.9,
      expectedReward: 0.5,
      status: 'proposed',
      safetyScore: 0.95,
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    };

    const result = guardrails.evaluateAction(unsafeCoolingAction, { currentTempCelsius: 23.0 });
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    // Should clamp setpointAdjustment so target temp is 20 C (20 - 23 = -3.0 C)
    expect(result.clampedParameters.setpointAdjustment).toBe(-3.0);
  });

  it('should flag high-risk cloud or fleet actions for mandatory human approval', () => {
    const guardrails = new OperationalGuardrails({ maxContinuousDriverHours: 4.0 });

    const longShiftAction: AgentAction = {
      id: 'act_shift',
      agentId: 'fleet_agent',
      domain: 'fleet_logistics',
      actionType: 'schedule_shift',
      actionVector: [1.0],
      parameters: { continuousShiftHours: 5.5 },
      confidence: 0.85,
      expectedReward: 0.4,
      status: 'proposed',
      safetyScore: 0.9,
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    };

    const result = guardrails.evaluateAction(longShiftAction);
    expect(result.passed).toBe(false);
    expect(result.requiresHumanApproval).toBe(true);
  });
});
