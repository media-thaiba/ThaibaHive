import { StudentTelemetryRecord, StudentRiskModel } from './student-risk-model';
import { StudentRiskAssessment } from './analytics-types';

/**
 * Retention Predictor orchestrating batch evaluations for an entire campus cohort
 */
export class RetentionPredictor {
  public static batchPredict(
    students: StudentTelemetryRecord[],
    modelWeights?: number[]
  ): {
    assessments: StudentRiskAssessment[];
    highRiskCount: number;
    criticalRiskCount: number;
    averageCohortRisk: number;
  } {
    if (!students || students.length === 0) {
      return { assessments: [], highRiskCount: 0, criticalRiskCount: 0, averageCohortRisk: 0 };
    }

    const assessments = students.map((s) => StudentRiskModel.evaluateRisk(s, modelWeights));
    const highRiskCount = assessments.filter((a) => a.riskCategory === 'HIGH').length;
    const criticalRiskCount = assessments.filter((a) => a.riskCategory === 'CRITICAL').length;
    const avgRisk = assessments.reduce((sum, a) => sum + a.riskProbability, 0) / assessments.length;

    return {
      assessments,
      highRiskCount,
      criticalRiskCount,
      averageCohortRisk: Number(avgRisk.toFixed(4)),
    };
  }
}
