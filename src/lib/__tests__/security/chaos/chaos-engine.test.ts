/**
 * Unit tests for Chaos Engine & Controller (ARES-005)
 */

import { ChaosEngine } from '@/lib/security/chaos/chaos-engine';
import { ExperimentController } from '@/lib/security/chaos/experiment-controller';
import { ChaosKillSwitch } from '@/lib/security/chaos/kill-switch';
import { ScenarioRegistry } from '@/lib/security/chaos/scenario-registry';

describe('ARES-005: ChaosEngine & ExperimentController', () => {
  beforeEach(() => {
    ChaosKillSwitch.resetInstance();
    ExperimentController.resetInstance();
    ChaosEngine.resetInstance();
  });

  it('should list canonical chaos scenarios', () => {
    const engine = ChaosEngine.getInstance();
    const scenarios = engine.getAvailableScenarios();

    expect(scenarios.length).toBeGreaterThanOrEqual(5);
    expect(scenarios.some((s) => s.faultType === 'NETWORK_PARTITION')).toBe(true);
    expect(scenarios.some((s) => s.faultType === 'CA_COMPROMISE')).toBe(true);
  });

  it('should execute a valid scenario and record completion metrics', async () => {
    const engine = ChaosEngine.getInstance();
    const result = await engine.runScenario('chaos-net-partition-edge');

    expect(result.state).toBe('COMPLETED');
    expect(result.recoveryTimeMs).toBeGreaterThan(0);
    expect(result.logs.length).toBeGreaterThan(3);
    expect(engine.getExecutionHistory().length).toBe(1);
  });

  it('should abort execution when emergency kill-switch is active', async () => {
    const engine = ChaosEngine.getInstance();
    await engine.emergencyAbortAll('Testing kill switch state');

    const result = await engine.runScenario('chaos-net-partition-edge');
    expect(result.state).toBe('ABORTED');
    expect(result.abortReason).toContain('kill-switch');
  });
});
