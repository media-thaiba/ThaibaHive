import { AirQualityModel } from '@/lib/operations/energy/air-quality-model';

describe('AIMS-005 — AirQualityModel (ASHRAE 62.1)', () => {
  it('should calculate outdoor airflow and detect CO2 purge conditions', () => {
    const model = new AirQualityModel();

    const vent = model.calculateRequiredVentilation(30, 800);
    // Rp * 30 (150) + Ra * 800 (48) = 198 CFM
    expect(vent.requiredCfm).toBe(198);
    expect(vent.recommendedDamperPositionPercent).toBeGreaterThan(10);

    const normalCo2 = model.evaluateCo2Threshold(650);
    expect(normalCo2.purgeRequired).toBe(false);
    expect(normalCo2.excessPpm).toBe(0);

    const highCo2 = model.evaluateCo2Threshold(1250);
    expect(highCo2.purgeRequired).toBe(true);
    expect(highCo2.excessPpm).toBe(250);
  });
});
