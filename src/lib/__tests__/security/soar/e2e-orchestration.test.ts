import { SoarSimulationRunner } from '../../../../../scripts/security/soar-simulation-runner';
import { QuarantineManager } from '@/lib/security/quarantine-manager';
import { soarOrchestrator } from '@/lib/security/soar/orchestrator';

describe('SOAR End-to-End Orchestration Simulation Tests', () => {
  beforeEach(() => {
    QuarantineManager.getInstance().reset();
    soarOrchestrator.clearHistory();
    soarOrchestrator.setEngineEnabled(true);
  });

  it('Scenario 1: should execute autonomous high-confidence botnet mitigation', async () => {
    const res = await SoarSimulationRunner.runBotnetMitigationScenario();
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
    expect(res.details.quarantineActive).toBe(true);
  });

  it('Scenario 2: should stage intermediate confidence threat in approval queue and execute upon resolution', async () => {
    const res = await SoarSimulationRunner.runApprovalWorkflowScenario();
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
    expect(res.details.subnetBanned).toBe(true);
  });

  it('Scenario 3: should execute LIFO SAGA compensation rollback when a step fails', async () => {
    const res = await SoarSimulationRunner.runCompensationRollbackScenario();
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
    expect(res.details.quarantineCleanedUp).toBe(true);
    expect(res.details.finalState).toBe('COMPENSATED');
  });

  it('Scenario 4: should reject executions when emergency killswitch is engaged', async () => {
    const res = await SoarSimulationRunner.runKillswitchScenario();
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
    expect(res.details.actionBlocked).toBe(true);
    expect(res.details.executionState).toBe('CANCELLED');
  });
});
