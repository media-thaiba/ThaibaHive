import { CampusRawIndicatorData, IPEDSBenchmarkMetrics } from './analytics-types';

/**
 * Standardized IPEDS / HESA Institutional Indicator Calculator
 */
export class InstitutionalIndicators {
  /**
   * Calculate normalized IPEDS/HESA metrics from raw institutional counts
   */
  public static calculateMetrics(data: CampusRawIndicatorData): IPEDSBenchmarkMetrics {
    const total = Math.max(1, data.totalStudents);
    const faculty = Math.max(1, data.facultyCount);

    const retentionRate = (data.retainedStudents / total) * 100.0;
    const graduationRate = (data.graduatedStudents / total) * 100.0;
    const studentFacultyRatio = total / faculty;
    const expenditurePerStudent = data.totalExpenditureDollars / total;

    return {
      retentionRatePercent: Number(Math.min(100, Math.max(0, retentionRate)).toFixed(2)),
      graduationRatePercent: Number(Math.min(100, Math.max(0, graduationRate)).toFixed(2)),
      studentFacultyRatio: Number(studentFacultyRatio.toFixed(2)),
      expenditurePerStudent: Number(expenditurePerStudent.toFixed(2)),
      energyEfficiencyKwhPerM2: Number(data.energyKwhPerSqMeter.toFixed(2)),
      averageAcademicGpa: Number(data.averageGpa.toFixed(2)),
    };
  }
}
