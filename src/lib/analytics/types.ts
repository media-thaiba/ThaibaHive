export interface RawStudentActivityData {
  studentId: string;
  tenantId: string;
  attendanceRate: number; // 0.0 - 1.0
  assignmentAvgScore: number; // 0 - 100
  examAvgScore: number; // 0 - 100
  lmsLoginCountLast30Days: number;
  feeOverdueDays: number;
  disciplinaryEventsCount: number;
}

export interface StudentFeatureVector {
  studentId: string;
  tenantId: string;
  attendanceFeature: number; // Normalized 0.0 - 1.0
  assignmentFeature: number; // Normalized 0.0 - 1.0
  examTrendFeature: number; // Normalized 0.0 - 1.0
  engagementFeature: number; // Normalized 0.0 - 1.0
  financialRiskFeature: number; // Normalized 0.0 - 1.0
  compositeVector: number[];
  extractedAt: number;
}

export interface StudentRiskAssessment {
  studentId: string;
  tenantId: string;
  riskScore: number; // 0 - 100%
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidenceScore: number; // 0.0 - 1.0
  primaryRiskDrivers: string[];
  recommendations: string[];
  assessedAt: number;
}

export interface RecommendedLearningPath {
  studentId: string;
  tenantId: string;
  pathTitle: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  suggestedActionItems: string[];
  targetCompletionDays: number;
  createdAt: number;
}
