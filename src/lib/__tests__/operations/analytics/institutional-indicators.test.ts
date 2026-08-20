import { InstitutionalIndicators } from '@/lib/operations/analytics/institutional-indicators';
import { CrossCampusBenchmarker } from '@/lib/operations/analytics/cross-campus-benchmarker';
import { CampusRawIndicatorData } from '@/lib/operations/analytics/analytics-types';

describe('InstitutionalIndicators & CrossCampusBenchmarker', () => {
  const sampleCampuses: CampusRawIndicatorData[] = [
    {
      campusId: 'campus_main',
      campusName: 'Main Campus',
      totalStudents: 1000,
      retainedStudents: 920,
      graduatedStudents: 850,
      facultyCount: 100,
      totalExpenditureDollars: 5000000,
      energyKwhPerSqMeter: 45,
      averageGpa: 3.4,
      timestamp: new Date().toISOString(),
    },
    {
      campusId: 'campus_city',
      campusName: 'City Campus',
      totalStudents: 500,
      retainedStudents: 410,
      graduatedStudents: 360,
      facultyCount: 40,
      totalExpenditureDollars: 2200000,
      energyKwhPerSqMeter: 65,
      averageGpa: 3.1,
      timestamp: new Date().toISOString(),
    },
    {
      campusId: 'campus_tech',
      campusName: 'Tech Campus',
      totalStudents: 800,
      retainedStudents: 760,
      graduatedStudents: 710,
      facultyCount: 90,
      totalExpenditureDollars: 4500000,
      energyKwhPerSqMeter: 38,
      averageGpa: 3.6,
      timestamp: new Date().toISOString(),
    },
  ];

  it('should compute standardized IPEDS metrics accurately', () => {
    const metrics = InstitutionalIndicators.calculateMetrics(sampleCampuses[0]);
    expect(metrics.retentionRatePercent).toBe(92.0);
    expect(metrics.graduationRatePercent).toBe(85.0);
    expect(metrics.studentFacultyRatio).toBe(10.0);
    expect(metrics.expenditurePerStudent).toBe(5000);
    expect(metrics.averageAcademicGpa).toBe(3.4);
  });

  it('should benchmark multiple campuses confidentially and assign rank positions', () => {
    const benchmarks = CrossCampusBenchmarker.computeConfidentialBenchmarking(sampleCampuses);

    expect(benchmarks.length).toBe(3);
    expect(benchmarks[0].rankPosition).toBe(1);
    expect(benchmarks[0].totalParticipatingCampuses).toBe(3);
    expect(benchmarks[0].percentiles.retentionRatePercent).toBeGreaterThanOrEqual(0);
    expect(benchmarks[0].percentiles.retentionRatePercent).toBeLessThanOrEqual(100);
  });
});
