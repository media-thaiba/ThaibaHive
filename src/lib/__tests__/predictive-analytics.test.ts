import { StudentFeatureExtractor } from "../analytics/feature-extractor";
import { StudentPredictionEngine } from "../analytics/prediction-engine";
import { LearningPathRecommender } from "../analytics/learning-path-recommender";
import { InferenceService } from "../analytics/inference-service";
import { RawStudentActivityData } from "../analytics/types";

describe("Predictive Learning Analytics Test Suite", () => {
  describe("GEI-006: Feature Extractor", () => {
    it("should extract normalized feature vectors correctly", () => {
      const extractor = new StudentFeatureExtractor();
      const rawData: RawStudentActivityData = {
        studentId: "stu-001",
        tenantId: "inst-001",
        attendanceRate: 0.80,
        assignmentAvgScore: 90,
        examAvgScore: 85,
        lmsLoginCountLast30Days: 15,
        feeOverdueDays: 0,
        disciplinaryEventsCount: 0,
      };

      const fv = extractor.extractFeatures(rawData);
      expect(fv.attendanceFeature).toBe(0.80);
      expect(fv.assignmentFeature).toBe(0.90);
      expect(fv.examTrendFeature).toBe(0.85);
      expect(fv.engagementFeature).toBe(0.50); // 15 / 30
      expect(fv.financialRiskFeature).toBe(1.0); // 0 overdue days
      expect(fv.compositeVector.length).toBe(5);
    });
  });

  describe("GEI-007: Prediction Engine & Learning Path Recommender", () => {
    it("should classify high-risk student and identify primary drivers", () => {
      const extractor = new StudentFeatureExtractor();
      const predictor = new StudentPredictionEngine();

      const rawData: RawStudentActivityData = {
        studentId: "stu-at-risk",
        tenantId: "inst-001",
        attendanceRate: 0.50,
        assignmentAvgScore: 40,
        examAvgScore: 45,
        lmsLoginCountLast30Days: 2,
        feeOverdueDays: 60,
        disciplinaryEventsCount: 2,
      };

      const fv = extractor.extractFeatures(rawData);
      const assessment = predictor.predictStudentRisk(fv);

      expect(assessment.riskLevel).toBe("HIGH");
      expect(assessment.riskScore).toBeGreaterThanOrEqual(50);
      expect(assessment.primaryRiskDrivers.length).toBeGreaterThan(0);
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });

    it("should generate intensive remediation learning path for high-risk student", () => {
      const recommender = new LearningPathRecommender();
      const assessment = {
        studentId: "stu-at-risk",
        tenantId: "inst-001",
        riskScore: 75,
        riskLevel: "HIGH" as const,
        confidenceScore: 0.95,
        primaryRiskDrivers: ["Low Attendance"],
        recommendations: ["Mandatory Review"],
        assessedAt: Date.now(),
      };

      const path = recommender.generatePath(assessment);
      expect(path.priority).toBe("HIGH");
      expect(path.targetCompletionDays).toBe(14);
      expect(path.pathTitle).toContain("Intensive Academic Remediation");
    });
  });

  describe("GEI-008: Inference Service", () => {
    it("should return prediction result within <100ms response SLA", async () => {
      const service = new InferenceService();
      const rawData: RawStudentActivityData = {
        studentId: "stu-perf",
        tenantId: "inst-001",
        attendanceRate: 0.88,
        assignmentAvgScore: 82,
        examAvgScore: 80,
        lmsLoginCountLast30Days: 20,
        feeOverdueDays: 0,
        disciplinaryEventsCount: 0,
      };

      const result = await service.evaluateStudent(rawData);
      expect(result.inferenceTimeMs).toBeLessThan(100);
      expect(result.assessment.studentId).toBe("stu-perf");
      expect(result.learningPath.studentId).toBe("stu-perf");
    });
  });
});
