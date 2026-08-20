import { runDigitalTwinSimulation } from '../../../../../scripts/operations/digital-twin-simulation-runner';

describe('Digital Twin Simulation Runner Test Suite (TWIN-023)', () => {
  it('should run all 8 stages of the Digital Twin simulation harness successfully', async () => {
    const result = await runDigitalTwinSimulation({ scenario: 'all' });
    expect(result.passed).toBe(true);
    expect(result.totalStages).toBe(8);
    expect(result.passedStages).toBe(8);
    expect(result.stages.length).toBe(8);
    expect(result.stages.every((s: any) => s.status === 'passed')).toBe(true);
  });

  it('should support targeted scenario runs via --scenario parameter', async () => {
    const spatialResult = await runDigitalTwinSimulation({ scenario: 'spatial' });
    expect(spatialResult.passed).toBe(true);
    expect(spatialResult.passedStages).toBe(1);

    const mlResult = await runDigitalTwinSimulation({ scenario: 'ml' });
    expect(mlResult.passed).toBe(true);
    expect(mlResult.passedStages).toBe(1);

    const emergResult = await runDigitalTwinSimulation({ scenario: 'emergency' });
    expect(emergResult.passed).toBe(true);
    expect(emergResult.passedStages).toBe(1);
  });
});
