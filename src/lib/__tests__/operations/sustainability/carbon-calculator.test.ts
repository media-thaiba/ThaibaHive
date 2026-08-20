import { CarbonCalculator } from '@/lib/operations/sustainability/carbon-calculator';

describe('AIMS-014 — CarbonCalculator', () => {
  it('should calculate Scope 1, 2, and 3 emissions adhering to GHG Protocol standards', () => {
    const calc = new CarbonCalculator();

    const emissions = calc.calculateEmissions({
      fuelLitersConsumed: 100, // Scope 1: 100 * 2.68 = 268 kg
      gridElectricityKwh: 2000, // Scope 2: 2000 * 0.475 = 950 kg
      cloudComputeCoreHours: 10000, // Scope 3: 10000 * 0.0035 = 35 kg
    });

    expect(emissions.scope1FleetFuelKgCo2e).toBe(268.0);
    expect(emissions.scope2GridElectricityKgCo2e).toBe(950.0);
    expect(emissions.scope3CloudComputeKgCo2e).toBe(35.0);
    expect(emissions.totalKgCo2e).toBe(1253.0);
    expect(emissions.totalMetricTonsCo2e).toBe(1.253);
  });
});
