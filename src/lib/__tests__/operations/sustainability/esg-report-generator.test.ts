import { EsgReportGenerator } from '@/lib/operations/sustainability/esg-report-generator';
import { ScopeEmissions } from '@/lib/operations/sustainability/sustainability-types';

describe('AIMS-015 — EsgReportGenerator', () => {
  it('should generate GRI-compliant ESG summaries with emission intensity per student', () => {
    const generator = new EsgReportGenerator();

    const emissions: ScopeEmissions = {
      scope1FleetFuelKgCo2e: 400,
      scope2GridElectricityKgCo2e: 1800,
      scope3CloudComputeKgCo2e: 100,
      totalKgCo2e: 2300,
      totalMetricTonsCo2e: 2.3,
    };

    const report = generator.generateReport(
      'campus_main',
      '2026-Q3',
      emissions,
      1150, // 1150 students -> 2.0 kg/student
      35.0,
      'inst_001'
    );

    expect(report.emissionsIntensityPerStudentKg).toBe(2.0);
    expect(report.renewableEnergyRatioPercent).toBe(35.0);
    expect(report.verifiedGRICompliant).toBe(true);
  });
});
