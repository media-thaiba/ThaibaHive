import { MicrogridSimulator } from '../../../operations/eco/simulation/microgrid-simulator';

describe('MicrogridSimulator End-to-End Simulation Test (ECO-023)', () => {
  it('should run 24-hour end-to-end autonomous microgrid simulation successfully', async () => {
    const report = await MicrogridSimulator.run24hSimulation('inst_test_01');

    expect(report.simulationId).toBeDefined();
    expect(report.durationHours).toBe(24);
    expect(report.totalSolarEnergyGeneratedKwh).toBeGreaterThan(500);
    expect(report.totalFacilityEnergyConsumedKwh).toBeGreaterThan(1000);
    expect(report.cleanEnergySelfSufficiencyPercent).toBeGreaterThan(10);
    expect(report.totalCostSavingsDollars).toBeGreaterThan(50);
    expect(report.savingsPercentage).toBeGreaterThanOrEqual(15);
    expect(report.merkleProofRoot).toHaveLength(64); // SHA-256
    expect(report.isCompliant).toBe(true);
  });
});
