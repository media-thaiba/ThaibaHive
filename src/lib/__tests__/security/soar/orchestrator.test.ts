import { soarOrchestrator } from '@/lib/security/soar/orchestrator';
import { actionRegistry } from '@/lib/security/soar/action-registry';
import { SecurityPlaybook, SoarTargetEntity } from '@/lib/security/soar/soar-types';

describe('SoarOrchestrator', () => {
  const mockTarget: SoarTargetEntity = { type: 'IP', value: '198.51.100.42' };

  beforeEach(() => {
    actionRegistry.clear();
    soarOrchestrator.clearHistory();
    soarOrchestrator.setEngineEnabled(true);
    soarOrchestrator.setConditionEvaluator(() => true);
    soarOrchestrator.setContextInterpolator((p) => p);
  });

  it('should successfully execute a multi-step playbook', async () => {
    const executedSteps: string[] = [];

    actionRegistry.registerAction({
      name: 'step_one',
      execute: async () => {
        executedSteps.push('step_one');
        return { step1: 'done' };
      },
    });

    actionRegistry.registerAction({
      name: 'step_two',
      execute: async () => {
        executedSteps.push('step_two');
        return { step2: 'done' };
      },
    });

    const playbook: SecurityPlaybook = {
      id: 'test-playbook-1',
      name: 'Test Playbook 1',
      version: '1.0.0',
      category: 'NETWORK',
      enabled: true,
      auto_execute: true,
      min_confidence: 80,
      triggers: [{ event_type: 'THREAT_DETECTED' }],
      steps: [
        { id: 's1', name: 'First Step', action: 'step_one' },
        { id: 's2', name: 'Second Step', action: 'step_two' },
      ],
    };

    const context = await soarOrchestrator.executePlaybook(playbook, { threat: 'malware' }, mockTarget);

    expect(context.state).toBe('COMPLETED');
    expect(executedSteps).toEqual(['step_one', 'step_two']);
    expect(context.steps['s1'].state).toBe('COMPLETED');
    expect(context.steps['s2'].state).toBe('COMPLETED');
    expect(context.steps['s1'].output).toEqual({ step1: 'done' });
  });

  it('should mark execution FAILED when a step fails without continue_on_error', async () => {
    actionRegistry.registerAction({
      name: 'failing_step',
      execute: async () => {
        throw new Error('Action API timeout');
      },
    });

    const playbook: SecurityPlaybook = {
      id: 'test-failing-playbook',
      name: 'Failing Playbook',
      version: '1.0.0',
      category: 'NETWORK',
      enabled: true,
      auto_execute: true,
      min_confidence: 80,
      triggers: [],
      steps: [
        { id: 's1', name: 'Step Will Fail', action: 'failing_step' },
      ],
    };

    const context = await soarOrchestrator.executePlaybook(playbook, {}, mockTarget);

    expect(context.state).toBe('FAILED');
    expect(context.steps['s1'].state).toBe('FAILED');
    expect(context.steps['s1'].error).toContain('Action API timeout');
  });

  it('should continue to next step if continue_on_error is true', async () => {
    const executedSteps: string[] = [];

    actionRegistry.registerAction({
      name: 'non_critical_failure',
      execute: async () => {
        throw new Error('Non-critical API error');
      },
    });

    actionRegistry.registerAction({
      name: 'succeeding_step',
      execute: async () => {
        executedSteps.push('succeeding_step');
        return { success: true };
      },
    });

    const playbook: SecurityPlaybook = {
      id: 'test-continue-playbook',
      name: 'Continue on Error Playbook',
      version: '1.0.0',
      category: 'NETWORK',
      enabled: true,
      auto_execute: true,
      min_confidence: 80,
      triggers: [],
      steps: [
        { id: 's1', name: 'Step 1', action: 'non_critical_failure', continue_on_error: true },
        { id: 's2', name: 'Step 2', action: 'succeeding_step' },
      ],
    };

    const context = await soarOrchestrator.executePlaybook(playbook, {}, mockTarget);

    expect(context.state).toBe('COMPLETED');
    expect(context.steps['s1'].state).toBe('FAILED');
    expect(context.steps['s2'].state).toBe('COMPLETED');
    expect(executedSteps).toEqual(['succeeding_step']);
  });

  it('should abort execution when emergency kill-switch is active', async () => {
    soarOrchestrator.setEngineEnabled(false);

    const playbook: SecurityPlaybook = {
      id: 'test-killswitch',
      name: 'Killswitch Playbook',
      version: '1.0.0',
      category: 'NETWORK',
      enabled: true,
      auto_execute: true,
      min_confidence: 80,
      triggers: [],
      steps: [{ id: 's1', name: 'Step 1', action: 'step_one' }],
    };

    const context = await soarOrchestrator.executePlaybook(playbook, {}, mockTarget);

    expect(context.state).toBe('CANCELLED');
    expect(context.error).toContain('kill-switch');
  });

  it('should enforce step timeout when action hangs', async () => {
    actionRegistry.registerAction({
      name: 'hanging_action',
      execute: async () => {
        return new Promise(resolve => setTimeout(resolve, 500));
      },
    });

    const playbook: SecurityPlaybook = {
      id: 'test-timeout',
      name: 'Timeout Playbook',
      version: '1.0.0',
      category: 'NETWORK',
      enabled: true,
      auto_execute: true,
      min_confidence: 80,
      triggers: [],
      steps: [
        { id: 's1', name: 'Hanging Step', action: 'hanging_action', timeout_ms: 50 },
      ],
    };

    const context = await soarOrchestrator.executePlaybook(playbook, {}, mockTarget);

    expect(context.state).toBe('FAILED');
    expect(context.steps['s1'].error).toContain('timed out after 50ms');
  });
});
