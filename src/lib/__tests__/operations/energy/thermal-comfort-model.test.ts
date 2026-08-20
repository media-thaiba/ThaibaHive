import { ThermalComfortModel } from '@/lib/operations/energy/thermal-comfort-model';

describe('AIMS-005 — ThermalComfortModel (ISO 7730 Fanger Model Comprehensive Suite)', () => {
  const model = new ThermalComfortModel();

  // Benchmark 1: Neutral Standard Office
  it('ISO 7730 Benchmark 1: Standard Neutral Office Condition (23.5°C, 50% RH, 0.1 m/s, 1.1 met, 0.65 clo)', () => {
    const metrics = model.calculateComfort('zone_neutral', {
      airTempCelsius: 23.5,
      meanRadiantTempCelsius: 23.5,
      relativeHumidityPercent: 50.0,
      airVelocityMps: 0.1,
      metabolicRateMet: 1.1,
      clothingInsulationClo: 0.65,
    });

    expect(Math.abs(metrics.pmv)).toBeLessThanOrEqual(0.5); // ISO Category A neutral band
    expect(metrics.ppd).toBeLessThanOrEqual(10.0);
    expect(['A_EXCELLENT', 'B_GOOD']).toContain(metrics.comfortClassification);
  });

  // Benchmark 2: Winter Conditions (Heavy Clothing)
  it('ISO 7730 Benchmark 2: Typical Winter Condition (21.0°C, 40% RH, 0.1 m/s, 1.2 met, 1.0 clo)', () => {
    const metrics = model.calculateComfort('zone_winter', {
      airTempCelsius: 21.0,
      meanRadiantTempCelsius: 21.0,
      relativeHumidityPercent: 40.0,
      airVelocityMps: 0.1,
      metabolicRateMet: 1.2,
      clothingInsulationClo: 1.0,
    });

    expect(metrics.pmv).toBeGreaterThanOrEqual(-0.6);
    expect(metrics.pmv).toBeLessThanOrEqual(0.6);
    expect(metrics.ppd).toBeLessThanOrEqual(15.0);
  });

  // Benchmark 3: Summer Conditions (Light Clothing)
  it('ISO 7730 Benchmark 3: Typical Summer Condition (25.0°C, 55% RH, 0.15 m/s, 1.0 met, 0.5 clo)', () => {
    const metrics = model.calculateComfort('zone_summer', {
      airTempCelsius: 25.0,
      meanRadiantTempCelsius: 25.0,
      relativeHumidityPercent: 55.0,
      airVelocityMps: 0.15,
      metabolicRateMet: 1.0,
      clothingInsulationClo: 0.5,
    });

    expect(metrics.pmv).toBeGreaterThanOrEqual(-0.7);
    expect(metrics.pmv).toBeLessThanOrEqual(0.8);
    expect(metrics.ppd).toBeGreaterThanOrEqual(5.0);
  });

  // Benchmark 4: Overcooled Zone
  it('ISO 7730 Benchmark 4: Overcooled Chilled Zone (17.0°C, 40% RH, 0.2 m/s, 1.0 met, 0.5 clo)', () => {
    const metrics = model.calculateComfort('zone_chilled', {
      airTempCelsius: 17.0,
      meanRadiantTempCelsius: 17.0,
      relativeHumidityPercent: 40.0,
      airVelocityMps: 0.2,
      metabolicRateMet: 1.0,
      clothingInsulationClo: 0.5,
    });

    expect(metrics.pmv).toBeLessThan(-1.0);
    expect(metrics.ppd).toBeGreaterThan(25.0);
    expect(metrics.comfortClassification).toBe('DISCOMFORT');
  });

  // Benchmark 5: Overheated High-Occupancy Lecture Hall
  it('ISO 7730 Benchmark 5: Overheated Humid Hall (30.0°C, 75% RH, 0.05 m/s, 1.3 met, 0.6 clo)', () => {
    const metrics = model.calculateComfort('zone_overheated', {
      airTempCelsius: 30.0,
      meanRadiantTempCelsius: 31.0,
      relativeHumidityPercent: 75.0,
      airVelocityMps: 0.05,
      metabolicRateMet: 1.3,
      clothingInsulationClo: 0.6,
    });

    expect(metrics.pmv).toBeGreaterThan(1.5);
    expect(metrics.ppd).toBeGreaterThan(50.0);
    expect(metrics.comfortClassification).toBe('DISCOMFORT');
  });

  // Benchmark 6: PPD Minimum Theoretical Limit
  it('ISO 7730 Benchmark 6: PPD must never fall below theoretical minimum of 5.0%', () => {
    const metrics = model.calculateComfort('zone_ideal', {
      airTempCelsius: 24.0,
      meanRadiantTempCelsius: 24.0,
      relativeHumidityPercent: 50.0,
      airVelocityMps: 0.1,
      metabolicRateMet: 1.0,
      clothingInsulationClo: 0.6,
    });

    expect(metrics.ppd).toBeGreaterThanOrEqual(5.0);
  });
});
