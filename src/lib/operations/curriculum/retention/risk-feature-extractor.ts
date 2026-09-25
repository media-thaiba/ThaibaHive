import { StudentRetentionFeatures } from './retention-types';

export class RiskFeatureExtractor {
  public extractFeatures(
    studentId: string,
    cumulativeGpa: number,
    priorTermGpa: number,
    courseDropCount: number = 0,
    prerequisiteFailureCount: number = 0,
    attendancePercentage: number = 85,
    lmsSubmissionDelayDays: number = 0,
    enrolledCredits: number = 15
  ): StudentRetentionFeatures {
    const gpaVelocity = Math.round((cumulativeGpa - priorTermGpa) * 100) / 100;
    const creditLoadDeviation = enrolledCredits - 15;

    return {
      studentId,
      cumulativeGpa,
      priorTermGpa,
      gpaVelocity,
      courseDropCount,
      prerequisiteFailureCount,
      attendancePercentage,
      lmsSubmissionDelayDays,
      creditLoadDeviation,
    };
  }
}
