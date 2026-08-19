export interface StudentMetrics {
  studentId: string;
  studentName: string;
  campusId: string;
  absenteeismRatePct: number; // e.g. 25.0 (%)
  gradeDropPct: number; // e.g. 18.0 (%)
  feeDelayDays: number; // e.g. 45 (days)
  disciplinaryFlagsCount?: number;
}

export interface RetentionPredictionResult {
  studentId: string;
  studentName: string;
  campusId: string;
  atRiskScore: number; // 0.00 to 1.00
  riskCategory: "LOW" | "MODERATE" | "HIGH";
  contributingFactors: string[];
  recommendedInterventions: string[];
  predictedAt: string;
}

export class StudentRetentionPredictor {
  private weightAbsenteeism = 0.08;
  private weightGradeDrop = 0.06;
  private weightFeeDelay = 0.04;
  private bias = -2.5;

  calculateRiskScore(metrics: StudentMetrics): number {
    const z =
      this.bias +
      this.weightAbsenteeism * metrics.absenteeismRatePct +
      this.weightGradeDrop * metrics.gradeDropPct +
      this.weightFeeDelay * metrics.feeDelayDays +
      (metrics.disciplinaryFlagsCount || 0) * 0.5;

    // Logistic sigmoid transformation: 1 / (1 + e^-z)
    const sigmoid = 1 / (1 + Math.exp(-z));
    return Math.min(Math.max(Number(sigmoid.toFixed(4)), 0.0001), 0.9999);
  }

  getRiskCategory(score: number): "LOW" | "MODERATE" | "HIGH" {
    if (score >= 0.7) return "HIGH";
    if (score >= 0.3) return "MODERATE";
    return "LOW";
  }

  predictRetentionRisk(metrics: StudentMetrics): RetentionPredictionResult {
    const atRiskScore = this.calculateRiskScore(metrics);
    const riskCategory = this.getRiskCategory(atRiskScore);
    const contributingFactors: string[] = [];
    const recommendedInterventions: string[] = [];

    if (metrics.absenteeismRatePct >= 20) {
      contributingFactors.push(`High absenteeism rate (${metrics.absenteeismRatePct}%)`);
      recommendedInterventions.push("Schedule parent-teacher conference & daily presence check");
    }

    if (metrics.gradeDropPct >= 15) {
      contributingFactors.push(`Significant grade drop (${metrics.gradeDropPct}%)`);
      recommendedInterventions.push("Assign remedial academic tutoring in core subjects");
    }

    if (metrics.feeDelayDays >= 30) {
      contributingFactors.push(`Extended fee payment delay (${metrics.feeDelayDays} days)`);
      recommendedInterventions.push("Offer flexible financial installment payment structure");
    }

    if (recommendedInterventions.length === 0) {
      recommendedInterventions.push("Maintain standard academic advisory monitoring");
    }

    return {
      studentId: metrics.studentId,
      studentName: metrics.studentName,
      campusId: metrics.campusId,
      atRiskScore,
      riskCategory,
      contributingFactors,
      recommendedInterventions,
      predictedAt: new Date().toISOString(),
    };
  }

  predictCampusRetention(
    campusId: string,
    students: StudentMetrics[]
  ): {
    campusId: string;
    totalEvaluated: number;
    highRiskCount: number;
    moderateRiskCount: number;
    lowRiskCount: number;
    predictions: RetentionPredictionResult[];
  } {
    const campusStudents = students.filter((s) => s.campusId === campusId || !s.campusId);
    const predictions = campusStudents.map((s) => this.predictRetentionRisk(s));

    const highRiskCount = predictions.filter((p) => p.riskCategory === "HIGH").length;
    const moderateRiskCount = predictions.filter((p) => p.riskCategory === "MODERATE").length;
    const lowRiskCount = predictions.filter((p) => p.riskCategory === "LOW").length;

    return {
      campusId,
      totalEvaluated: predictions.length,
      highRiskCount,
      moderateRiskCount,
      lowRiskCount,
      predictions,
    };
  }
}

export const defaultRetentionPredictor = new StudentRetentionPredictor();
