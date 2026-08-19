import { StudentFeatureVector, StudentRiskAssessment } from "./types";

export class StudentPredictionEngine {
  // Feature weights for weighted risk evaluation
  private weights = {
    attendance: 0.35,
    examTrend: 0.30,
    assignment: 0.20,
    engagement: 0.10,
    financial: 0.05,
  };

  public predictStudentRisk(featureVector: StudentFeatureVector): StudentRiskAssessment {
    const { attendanceFeature, examTrendFeature, assignmentFeature, engagementFeature, financialRiskFeature } = featureVector;

    // Academic safety score (higher = safer, 0.0 - 1.0)
    const safetyScore =
      attendanceFeature * this.weights.attendance +
      examTrendFeature * this.weights.examTrend +
      assignmentFeature * this.weights.assignment +
      engagementFeature * this.weights.engagement +
      financialRiskFeature * this.weights.financial;

    // Risk score percentage (higher = riskier, 0 - 100%)
    const riskScore = Math.round((1 - safetyScore) * 100);

    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (riskScore >= 50) {
      riskLevel = "HIGH";
    } else if (riskScore >= 25) {
      riskLevel = "MEDIUM";
    }

    const primaryRiskDrivers: string[] = [];
    const recommendations: string[] = [];

    if (attendanceFeature < 0.75) {
      primaryRiskDrivers.push(`Low Attendance (${Math.round(attendanceFeature * 100)}%)`);
      recommendations.push("Schedule mandatory counselor attendance review session");
    }

    if (examTrendFeature < 0.60) {
      primaryRiskDrivers.push(`Declining Exam Scores (${Math.round(examTrendFeature * 100)}%)`);
      recommendations.push("Assign peer tutor for weak subject areas");
    }

    if (assignmentFeature < 0.60) {
      primaryRiskDrivers.push(`Incomplete Assignments (${Math.round(assignmentFeature * 100)}%)`);
      recommendations.push("Enable assignment deadline reminder notifications");
    }

    if (engagementFeature < 0.40) {
      primaryRiskDrivers.push("Low LMS Activity");
      recommendations.push("Recommend supplementary interactive study modules");
    }

    if (financialRiskFeature < 0.50) {
      primaryRiskDrivers.push("Overdue Tuition Payment");
      recommendations.push("Refer to financial aid officer for fee installment plan");
    }

    if (primaryRiskDrivers.length === 0) {
      recommendations.push("Continue standard academic track");
    }

    return {
      studentId: featureVector.studentId,
      tenantId: featureVector.tenantId,
      riskScore,
      riskLevel,
      confidenceScore: 0.92,
      primaryRiskDrivers,
      recommendations,
      assessedAt: Date.now(),
    };
  }

  public batchPredict(featureVectors: StudentFeatureVector[]): StudentRiskAssessment[] {
    return featureVectors.map((fv) => this.predictStudentRisk(fv));
  }
}
