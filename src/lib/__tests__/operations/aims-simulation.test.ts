import { runAimsSimulation } from '../../../../scripts/operations/aims-simulation-runner';

describe('AIMS-024 — End-to-End AIMS Simulation Runner', () => {
  it('should execute full smart campus multi-agent simulation workflow with 100% success', async () => {
    const result = await runAimsSimulation(true);

    expect(result.success).toBe(true);
    expect(result.marlStep.jointValueEstimate).toBeDefined();
    expect(result.hvacRes.optimizedSetpointCelsius).toBeGreaterThanOrEqual(18);
    expect(result.route.stops.length).toBe(2);
    expect(result.bioMatch.success).toBe(true);
    expect(result.zkpRes.valid).toBe(true);
    expect(result.cloudRec?.monthlySavingsDollars).toBeGreaterThan(0);
    expect(result.emissions.totalKgCo2e).toBeGreaterThan(0);
    expect(result.booking.success).toBe(true);
    expect(result.auditValid).toBe(true);
  });
});
