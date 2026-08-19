import { compensationHandler } from '@/lib/security/soar/compensation-handler';
import { actionRegistry } from '@/lib/security/soar/action-registry';
import { SoarExecutionContext } from '@/lib/security/soar/soar-types';
import { soarOrchestrator } from '@/lib/security/soar/orchestrator';

describe('CompensationHandler', () => {
  beforeEach(() => {
    actionRegistry.clear();
    soarOrchestrator.clearHistory();
  });

  it('should execute reverse compensating actions in LIFO order', async () => {
    const executedCompensations: string[] = [];

    actionRegistry.registerAction({
      name: 'action_step_1',
      execute: async () => ({ ruleId: 'rule-101' }),
      compensate: async (params, output) => {
        executedCompensations.push(`compensated_step_1:${output.ruleId}`);
      },
    });

    actionRegistry.registerAction({
      name: 'action_step_2',
      execute: async () => ({ ipBanned: '1.2.3.4' }),
      compensate: async (params, output) => {
        executedCompensations.push(`compensated_step_2:${output.ipBanned}`);
      },
    });

    const mockContext: SoarExecutionContext = {
      execution_id: 'exec-fail-test',
      playbook_id: 'pb-1',
      playbook_name: 'Rollback Test Playbook',
      trigger_payload: {},
      target_entity: { type: 'IP', value: '1.2.3.4' },
      state: 'FAILED',
      step_order: ['s1', 's2', 's3'],
      started_at: new Date().toISOString(),
      steps: {
        s1: {
          step_id: 's1',
          name: 'Step 1',
          action: 'action_step_1',
          state: 'COMPLETED',
          started_at: new Date().toISOString(),
          input_params: {},
          output: { ruleId: 'rule-101' },
        },
        s2: {
          step_id: 's2',
          name: 'Step 2',
          action: 'action_step_2',
          state: 'COMPLETED',
          started_at: new Date().toISOString(),
          input_params: {},
          output: { ipBanned: '1.2.3.4' },
        },
        s3: {
          step_id: 's3',
          name: 'Step 3',
          action: 'unregistered_action',
          state: 'FAILED',
          started_at: new Date().toISOString(),
          input_params: {},
          error: 'Action failed',
        },
      },
    };

    const result = await compensationHandler.rollback(mockContext);

    expect(result.success).toBe(true);
    expect(result.total_compensated).toBe(2);
    expect(result.total_failed).toBe(0);
    // Verified LIFO order: step 2 compensated BEFORE step 1
    expect(executedCompensations).toEqual([
      'compensated_step_2:1.2.3.4',
      'compensated_step_1:rule-101',
    ]);
  });

  it('should handle partial compensation failure without halting other steps', async () => {
    actionRegistry.registerAction({
      name: 'failing_compensate',
      execute: async () => ({ ok: true }),
      compensate: async () => {
        throw new Error('Compensation endpoint unreachable');
      },
    });

    actionRegistry.registerAction({
      name: 'working_compensate',
      execute: async () => ({ ok: true }),
      compensate: async () => {},
    });

    const mockContext: SoarExecutionContext = {
      execution_id: 'exec-partial-fail',
      playbook_id: 'pb-2',
      playbook_name: 'Partial Fail Test',
      trigger_payload: {},
      target_entity: { type: 'IP', value: '1.2.3.4' },
      state: 'FAILED',
      step_order: ['s1', 's2'],
      started_at: new Date().toISOString(),
      steps: {
        s1: {
          step_id: 's1',
          name: 'Step 1',
          action: 'working_compensate',
          state: 'COMPLETED',
          started_at: new Date().toISOString(),
          input_params: {},
          output: { ok: true },
        },
        s2: {
          step_id: 's2',
          name: 'Step 2',
          action: 'failing_compensate',
          state: 'COMPLETED',
          started_at: new Date().toISOString(),
          input_params: {},
          output: { ok: true },
        },
      },
    };

    const result = await compensationHandler.rollback(mockContext);

    expect(result.success).toBe(false);
    expect(result.total_compensated).toBe(1);
    expect(result.total_failed).toBe(1);
    expect(mockContext.steps['s2'].error).toContain('Compensation endpoint unreachable');
    expect(mockContext.steps['s1'].state).toBe('COMPENSATED');
  });

  it('should automatically compensate in SoarOrchestrator when rollback_strategy is COMPENSATE', async () => {
    let unquarantined = false;

    actionRegistry.registerAction({
      name: 'quarantine_step',
      execute: async () => ({ quarantined: true }),
      compensate: async () => {
        unquarantined = true;
      },
    });

    actionRegistry.registerAction({
      name: 'failing_downstream_step',
      execute: async () => {
        throw new Error('Downstream API connection reset');
      },
    });

    const playbook = {
      id: 'pb-orchestrator-rollback',
      name: 'Orchestrator Rollback Test',
      version: '1.0.0',
      category: 'NETWORK' as const,
      enabled: true,
      auto_execute: true,
      min_confidence: 80,
      rollback_strategy: 'COMPENSATE' as const,
      triggers: [],
      steps: [
        { id: 'step_1', name: 'Quarantine', action: 'quarantine_step' },
        { id: 'step_2', name: 'Downstream', action: 'failing_downstream_step' },
      ],
    };

    const context = await soarOrchestrator.executePlaybook(
      playbook,
      {},
      { type: 'IP', value: '1.2.3.4' }
    );

    expect(context.state).toBe('COMPENSATED');
    expect(context.compensation_status).toBe('COMPLETED');
    expect(unquarantined).toBe(true);
  });
});
