import { CarbonAccountingEngine } from '../../../operations/eco/carbon/carbon-accounting-engine';
import { EmissionFactorRegistry } from '../../../operations/eco/carbon/emission-factor-registry';
import { ActivityEmissionInput } from '../../../operations/eco/eco-types';

describe('CarbonAccountingEngine Unit Tests', () => {
  let engine: CarbonAccountingEngine;
  let registry: EmissionFactorRegistry;

  beforeEach(() => {
    registry = EmissionFactorRegistry.getInstance();
    engine = new CarbonAccountingEngine(registry);
  });

  it('should calculate Scope 1 stationary diesel emissions accurately', () => {
    const input: ActivityEmissionInput = {
      facilityId: 'fac_main',
      departmentId: 'dept_facilities',
      scope: 'scope_1',
      category: 'stationary_combustion',
      fuelOrSource: 'diesel_generator',
      quantity: 500, // 500 liters
      unit: 'liters',
      activityDate: '2026-08-21',
    };

    const record = engine.calculateActivityEmission(input);
    expect(record.scope).toBe('scope_1');
    expect(record.emissionFactorUsed).toBeCloseTo(2.696, 3);
    // 500 * 2.696 = 1348 kg CO2e
    expect(record.co2EquivalentKg).toBeCloseTo(1348.0, 1);
    expect(record.auditHash).toBeDefined();
    expect(record.auditHash).toHaveLength(64); // SHA-256
  });

  it('should calculate Scope 2 location-based electricity emissions', () => {
    const input: ActivityEmissionInput = {
      facilityId: 'fac_engineering',
      departmentId: 'dept_cs',
      scope: 'scope_2',
      category: 'electricity_location',
      fuelOrSource: 'grid_mix_location',
      quantity: 10000, // 10,000 kWh
      unit: 'kWh',
      activityDate: '2026-08-21',
    };

    const record = engine.calculateActivityEmission(input, 'US_AVERAGE');
    expect(record.scope).toBe('scope_2');
    expect(record.emissionFactorUsed).toBeCloseTo(0.377, 3);
    expect(record.co2EquivalentKg).toBeCloseTo(3770, 0);
  });

  it('should process a comprehensive batch and compute Scope 1/2/3 breakdown and net emissions', () => {
    const batch: ActivityEmissionInput[] = [
      // Scope 1
      {
        facilityId: 'fac_main',
        departmentId: 'dept_transport',
        scope: 'scope_1',
        category: 'mobile_fleet',
        fuelOrSource: 'diesel_van_bus',
        quantity: 200, // liters
        unit: 'liters',
        activityDate: '2026-08-21',
      },
      // Scope 2 (Location)
      {
        facilityId: 'fac_main',
        departmentId: 'dept_engineering',
        scope: 'scope_2',
        category: 'electricity_location',
        fuelOrSource: 'grid_mix_location',
        quantity: 5000, // kWh
        unit: 'kWh',
        activityDate: '2026-08-21',
      },
      // Scope 3 (Commute)
      {
        facilityId: 'fac_main',
        departmentId: 'dept_engineering',
        scope: 'scope_3',
        category: 'commute',
        fuelOrSource: 'passenger_car_ice',
        quantity: 1000, // km
        unit: 'km',
        activityDate: '2026-08-21',
      },
    ];

    const retiredOffsetsKg = 500; // 500 kg offset retired
    const result = engine.calculateBatchEmissions(batch, retiredOffsetsKg, 'US_AVERAGE');

    expect(result.records).toHaveLength(3);
    expect(result.breakdown.scope1Kg).toBeGreaterThan(500);
    expect(result.breakdown.scope2LocationKg).toBeGreaterThan(1500);
    expect(result.breakdown.scope3Kg).toBeGreaterThan(150);

    const gross = result.breakdown.totalGrossKg;
    expect(result.breakdown.offsetsRetiredKg).toBe(500);
    expect(result.breakdown.totalNetKg).toBeCloseTo(gross - 500, 2);
    expect(result.merkleRoot).toHaveLength(64);
  });

  it('should summarize departmental emissions and per-capita intensity', () => {
    const records = [
      engine.calculateActivityEmission({
        facilityId: 'fac_main',
        departmentId: 'dept_cs',
        scope: 'scope_2',
        category: 'electricity_location',
        fuelOrSource: 'grid_mix_location',
        quantity: 2000,
        unit: 'kWh',
        activityDate: '2026-08-21',
      }),
      engine.calculateActivityEmission({
        facilityId: 'fac_main',
        departmentId: 'dept_bio',
        scope: 'scope_1',
        category: 'stationary_combustion',
        fuelOrSource: 'natural_gas',
        quantity: 100,
        unit: 'm3',
        activityDate: '2026-08-21',
      }),
    ];

    const summaries = engine.summarizeByDepartment(records, { dept_cs: 50, dept_bio: 20 });
    expect(summaries).toHaveLength(2);
    expect(summaries[0].departmentId).toBeDefined();
    expect(summaries[0].perCapitaKg).toBeGreaterThan(0);
  });

  it('should evaluate building Eco-Score and EUI index', () => {
    const summaryA = engine.evaluateBuildingEcoScore(40000, 1000, 20000, 8000);
    expect(summaryA.energyUseIntensityKwhPerM2).toBe(40.0);
    expect(summaryA.solarSelfConsumptionPercent).toBe(50.0);
    expect(summaryA.ecoScoreGrade).toBe('A+');

    const summaryD = engine.evaluateBuildingEcoScore(250000, 1000, 0, 50000);
    expect(summaryD.energyUseIntensityKwhPerM2).toBe(250.0);
    expect(summaryD.ecoScoreGrade).toBe('D');
  });
});
