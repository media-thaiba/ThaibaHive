import { DepartmentalCarbonAllocator, DepartmentAllocationProfile } from '../../../operations/eco/carbon/departmental-carbon-allocator';
import { BuildingFootprintIndexer } from '../../../operations/eco/carbon/building-footprint-indexer';

describe('DepartmentalCarbonAllocator & BuildingFootprintIndexer Unit Tests', () => {
  it('should compute building EUI and benchmark grade', () => {
    const indexer = new BuildingFootprintIndexer();
    indexer.registerBuilding({
      facilityId: 'fac_library',
      name: 'Central University Library',
      grossFloorAreaM2: 5000,
      occupancyCapacity: 800,
      primaryUse: 'academic',
      meterIds: ['meter_lib_01'],
    });

    // 400,000 kWh annual on 5,000 m2 = 80 kWh/m2 -> Grade A
    const metricsA = indexer.calculateBuildingMetrics('fac_library', 400000, 100000, 150000);
    expect(metricsA.euiKwhPerM2).toBe(80.0);
    expect(metricsA.solarSelfSufficiencyPercent).toBe(25.0);
    expect(metricsA.benchmarkGrade).toBe('A');

    // 1,200,000 kWh on 5,000 m2 = 240 kWh/m2 -> Grade D
    const metricsD = indexer.calculateBuildingMetrics('fac_library', 1200000, 0, 450000);
    expect(metricsD.euiKwhPerM2).toBe(240.0);
    expect(metricsD.benchmarkGrade).toBe('D');
  });

  it('should allocate building carbon emissions to occupant departments proportionally', () => {
    const departments: DepartmentAllocationProfile[] = [
      {
        departmentId: 'dept_cs',
        name: 'Computer Science',
        headcount: 200,
        allocatedAreaM2: 2500,
        facilityShares: [
          { facilityId: 'fac_eng', areaSharePercent: 50 }, // 50% of Engineering Hall
        ],
      },
      {
        departmentId: 'dept_ee',
        name: 'Electrical Engineering',
        headcount: 100,
        allocatedAreaM2: 2500,
        facilityShares: [
          { facilityId: 'fac_eng', areaSharePercent: 50 }, // 50% of Engineering Hall
        ],
      },
    ];

    const facilityEmissionsMap = {
      fac_eng: {
        scope1Kg: 10000,
        scope2Kg: 50000,
        scope3Kg: 15000,
      },
    };

    const summaries = DepartmentalCarbonAllocator.allocateEmissions(departments, facilityEmissionsMap);
    expect(summaries).toHaveLength(2);

    // Each gets 50% of 75,000 kg = 37,500 kg
    expect(summaries[0].grossEmissionsKg).toBe(37500);
    expect(summaries[1].grossEmissionsKg).toBe(37500);

    // CS headcount is 200 -> 37,500 / 200 = 187.5 kg / capita
    const cs = summaries.find((s) => s.departmentId === 'dept_cs');
    expect(cs?.perCapitaKg).toBe(187.5);

    // EE headcount is 100 -> 37,500 / 100 = 375 kg / capita
    const ee = summaries.find((s) => s.departmentId === 'dept_ee');
    expect(ee?.perCapitaKg).toBe(375.0);
  });
});
