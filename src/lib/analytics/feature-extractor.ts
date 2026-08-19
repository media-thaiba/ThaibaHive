import { RawStudentActivityData, StudentFeatureVector } from "./types";

export class StudentFeatureExtractor {
  /**
   * Normalizes raw student interaction metrics into a standardized [0, 1] feature vector.
   */
  public extractFeatures(rawData: RawStudentActivityData): StudentFeatureVector {
    // 1. Attendance feature (0.0 to 1.0)
    const attendanceFeature = Math.max(0, Math.min(1, rawData.attendanceRate || 0));

    // 2. Assignment feature (score 0-100 mapped to 0.0-1.0)
    const assignmentFeature = Math.max(0, Math.min(1, (rawData.assignmentAvgScore || 0) / 100));

    // 3. Exam trend feature (score 0-100 mapped to 0.0-1.0)
    const examTrendFeature = Math.max(0, Math.min(1, (rawData.examAvgScore || 0) / 100));

    // 4. Engagement feature (LMS logins 0-30 days, capped at 30)
    const engagementFeature = Math.max(0, Math.min(1, (rawData.lmsLoginCountLast30Days || 0) / 30));

    // 5. Financial risk feature (fee overdue days: 0 days = 1.0 good, >90 days = 0.0 risk)
    const feeDays = rawData.feeOverdueDays || 0;
    const financialRiskFeature = Math.max(0, Math.min(1, 1 - feeDays / 90));

    const compositeVector = [
      attendanceFeature,
      assignmentFeature,
      examTrendFeature,
      engagementFeature,
      financialRiskFeature,
    ];

    return {
      studentId: rawData.studentId,
      tenantId: rawData.tenantId,
      attendanceFeature,
      assignmentFeature,
      examTrendFeature,
      engagementFeature,
      financialRiskFeature,
      compositeVector,
      extractedAt: Date.now(),
    };
  }

  public batchExtractFeatures(rawDataList: RawStudentActivityData[]): StudentFeatureVector[] {
    return rawDataList.map((data) => this.extractFeatures(data));
  }
}
