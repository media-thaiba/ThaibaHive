import { StudentRiskAssessment } from './analytics-types';

export interface StudentTelemetryRecord {
  studentId: string;
  campusId: string;
  gpa: number;              // 0.0 - 4.0
  attendancePercentage: number; // 0 - 100
  lmsActiveHoursPerWeek: number;
  unpaidFeeBalance: number;
  prerequisiteCoursesPassedRatio: number; // 0.0 - 1.0
}

/**
 * Federated Student Risk & Early Intervention Model
 */
export class StudentRiskModel {
  /**
   * Evaluate student risk score using trained federated weights
   */
  public static evaluateRisk(
    record: StudentTelemetryRecord,
    modelWeights?: number[]
  ): StudentRiskAssessment {
    // Normalized risk factor features:
    // 1. GPA deficit: (4.0 - gpa) / 4.0
    // 2. Attendance deficit: (100 - attendance) / 100
    // 3. LMS deficit: max(0, 10 - lmsHours) / 10
    // 4. Unpaid Fee scale: min(1.0, unpaidFee / 2000)
    // 5. Prereq deficit: (1.0 - prereqRatio)
    const gpaDeficit = Math.max(0, 4.0 - record.gpa) / 4.0;
    const attDeficit = Math.max(0, 100 - record.attendancePercentage) / 100;
    const lmsDeficit = Math.max(0, 10 - record.lmsActiveHoursPerWeek) / 10;
    const feeRisk = Math.min(1.0, Math.max(0, record.unpaidFeeBalance) / 2000);
    const prereqDeficit = Math.max(0, 1.0 - record.prerequisiteCoursesPassedRatio);

    const x = [gpaDeficit, attDeficit, lmsDeficit, feeRisk, prereqDeficit];
    const weights = modelWeights && modelWeights.length === 5 ? modelWeights : [1.8, 2.2, 1.2, 1.0, 1.5];

    let logit = -2.5; // baseline low risk
    for (let i = 0; i < x.length; i++) {
      logit += x[i] * weights[i];
    }

    // Sigmoid risk probability
    const pRisk = 1 / (1 + Math.exp(-Math.max(-50, Math.min(50, logit))));
    const riskProbability = Number(Math.max(0, Math.min(1.0, pRisk)).toFixed(4));

    let riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskProbability >= 0.75) riskCategory = 'CRITICAL';
    else if (riskProbability >= 0.50) riskCategory = 'HIGH';
    else if (riskProbability >= 0.25) riskCategory = 'MEDIUM';

    const topRiskFactors: string[] = [];
    const recommendedInterventions: string[] = [];

    if (record.attendancePercentage < 75) {
      topRiskFactors.push(`Low attendance (${record.attendancePercentage}%)`);
      recommendedInterventions.push('Schedule academic counselor check-in');
    }
    if (record.gpa < 2.5) {
      topRiskFactors.push(`GPA below threshold (${record.gpa.toFixed(2)})`);
      recommendedInterventions.push('Enroll in remedial tutoring sessions');
    }
    if (record.lmsActiveHoursPerWeek < 4) {
      topRiskFactors.push(`Low LMS engagement (${record.lmsActiveHoursPerWeek} hrs/week)`);
      recommendedInterventions.push('Send automated digital study reminders');
    }
    if (record.unpaidFeeBalance > 500) {
      topRiskFactors.push(`Outstanding tuition fee ($${record.unpaidFeeBalance})`);
      recommendedInterventions.push('Connect with Student Financial Aid Office');
    }

    if (topRiskFactors.length === 0) {
      topRiskFactors.push('Stable academic and engagement trajectory');
      recommendedInterventions.push('Maintain regular course milestones');
    }

    return {
      studentId: record.studentId,
      campusId: record.campusId,
      riskProbability,
      riskCategory,
      topRiskFactors,
      recommendedInterventions,
      assessedAt: new Date().toISOString(),
    };
  }
}
