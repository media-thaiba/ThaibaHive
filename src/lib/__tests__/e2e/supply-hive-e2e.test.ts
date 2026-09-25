import { runSupplyChainSimulation, SupplySimulationResult } from '../../../../scripts/operations/supply-chain-simulation-runner';

describe('SUPPLY-HIVE / ProcurementOS E2E Lifecycle Suite (SUPPLY-024)', () => {
  it('should successfully execute all 8 supply chain lifecycle simulation stages', async () => {
    const result: SupplySimulationResult = await runSupplyChainSimulation({ scenario: 'all' });
    expect(result.passed).toBe(true);
    expect(result.passedStages).toBe(8);
    expect(result.totalStages).toBe(8);

    for (const stage of result.stages) {
      expect(stage.status).toBe('passed');
    }
  });
});
