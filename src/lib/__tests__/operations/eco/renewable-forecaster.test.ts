import { RenewableForecaster, GenerationAssetConfig } from '../../../operations/eco/ml/renewable-forecaster';
import { SolarPhysicsModel } from '../../../operations/eco/ml/solar-physics-model';
import { WindPowerCurve } from '../../../operations/eco/ml/wind-power-curve';

describe('RenewableForecaster & SolarPhysics & WindPowerCurve Unit Tests', () => {
  let forecaster: RenewableForecaster;

  beforeEach(() => {
    forecaster = new RenewableForecaster();
  });

  it('should compute solar PV physics power derating and inverter capping', () => {
    const spec = {
      peakCapacityKw: 100,
      tiltAngleDeg: 15,
      azimuthAngleDeg: 180,
      temperatureCoefficientPerC: -0.0038,
      noctDegC: 45,
      inverterEfficiency: 0.98,
      systemLossFactor: 0.88,
    };

    // Low irradiance (e.g. 200 W/m2)
    const lowSun = SolarPhysicsModel.calculatePowerOutput(200, 25, spec);
    expect(lowSun.powerKw).toBeGreaterThan(10);
    expect(lowSun.powerKw).toBeLessThan(25);

    // Peak irradiance (1000 W/m2) at 35C ambient
    const peakSun = SolarPhysicsModel.calculatePowerOutput(1000, 35, spec);
    expect(peakSun.powerKw).toBeGreaterThan(70);
    expect(peakSun.powerKw).toBeLessThanOrEqual(100);
    expect(peakSun.cellTempC).toBeGreaterThan(35);
  });

  it('should compute wind turbine power curve output across cut-in, rated, and cut-out speeds', () => {
    const spec = {
      ratedCapacityKw: 50,
      cutInSpeedMs: 3.0,
      ratedSpeedMs: 11.0,
      cutOutSpeedMs: 25.0,
      hubHeightMeters: 30,
    };

    // Below cut-in
    expect(WindPowerCurve.calculatePowerOutput(2.0, spec)).toBe(0);
    // At moderate speed (7 m/s)
    const midSpeedPower = WindPowerCurve.calculatePowerOutput(7.0, spec);
    expect(midSpeedPower).toBeGreaterThan(10);
    expect(midSpeedPower).toBeLessThan(50);
    // At rated speed (12 m/s)
    expect(WindPowerCurve.calculatePowerOutput(12.0, spec)).toBe(50);
    // Above cut-out (26 m/s)
    expect(WindPowerCurve.calculatePowerOutput(26.0, spec)).toBe(0);
  });

  it('should forecast 24-hour campus renewable generation with confidence intervals', async () => {
    const config: GenerationAssetConfig = {
      solarArrays: [
        {
          sourceId: 'array_01',
          name: 'Engineering Rooftop',
          spec: { peakCapacityKw: 250, tiltAngleDeg: 15, azimuthAngleDeg: 180 },
        },
      ],
      windTurbines: [
        {
          sourceId: 'turbine_01',
          name: 'Campus Wind Turbine 1',
          spec: { ratedCapacityKw: 50, hubHeightMeters: 30 },
        },
      ],
      latitude: 28.6139,
      longitude: 77.2090,
    };

    const startTime = new Date('2026-08-21T06:00:00.000Z');
    const result = await forecaster.forecast(config, 24, startTime);

    expect(result.points).toHaveLength(24);
    expect(result.totalForecastKwh).toBeGreaterThan(0);
    expect(result.peakGenerationKw).toBeGreaterThan(100);

    // Check confidence bands
    for (const pt of result.points) {
      expect(pt.confidenceLowerP10Kw).toBeLessThanOrEqual(pt.forecastedGenerationKw);
      expect(pt.confidenceUpperP90Kw).toBeGreaterThanOrEqual(pt.forecastedGenerationKw);
    }
  });

  it('should evaluate forecast accuracy against historical benchmarks', () => {
    const actual = [0, 0, 10, 45, 120, 210, 245, 230, 180, 95, 20, 0];
    const predicted = [0, 0, 12, 48, 115, 205, 240, 235, 175, 90, 18, 0];

    const evalResult = forecaster.evaluateAccuracy(predicted, actual);
    expect(evalResult.rSquared).toBeGreaterThanOrEqual(0.85);
    expect(evalResult.mapePercent).toBeLessThan(15);
    expect(evalResult.isPassed).toBe(true);
  });
});
