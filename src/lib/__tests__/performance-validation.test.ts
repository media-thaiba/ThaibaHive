import {
  performanceCycleCreateSchema,
  competencyFrameworkCreateSchema,
  evaluationFormCreateSchema,
  selfAssessmentSubmitSchema,
  managerEvaluationSubmitSchema,
  performanceGoalCreateSchema,
} from "../validation/schemas";
import { hasPermission } from "@thaiba/auth/roles";

describe("Sprint-007 Validation Schemas & RBAC Permission Tests", () => {
  describe("Performance Cycle Validation", () => {
    it("validates valid performance cycle creation payload", () => {
      const valid = performanceCycleCreateSchema.safeParse({
        title: "2026 Q3 Staff Appraisal",
        cycleType: "quarterly",
        startDate: "2026-07-01",
        endDate: "2026-09-30",
        selfAssessmentDeadline: "2026-08-15",
        managerReviewDeadline: "2026-08-31",
      });

      expect(valid.success).toBe(true);
    });

    it("rejects missing title or dates", () => {
      const invalid = performanceCycleCreateSchema.safeParse({
        cycleType: "quarterly",
      });

      expect(invalid.success).toBe(false);
    });
  });

  describe("Competency Framework & Evaluation Form Validation", () => {
    it("validates framework creation with metrics JSON", () => {
      const valid = competencyFrameworkCreateSchema.safeParse({
        name: "Academic Teaching Excellence",
        metricsJson: JSON.stringify([{ id: "m1", name: "Curriculum Delivery", weight: 40 }]),
      });

      expect(valid.success).toBe(true);
    });

    it("validates evaluation form template payload", () => {
      const valid = evaluationFormCreateSchema.safeParse({
        frameworkId: "fw_001",
        title: "Faculty Quarterly Review Form",
        metricsConfigJson: JSON.stringify([{ metricId: "m1", ratingScale: "1-5" }]),
      });

      expect(valid.success).toBe(true);
    });
  });

  describe("Self-Assessment & Manager Evaluation Submissions", () => {
    it("validates self assessment ratings within 1-5 scale", () => {
      const valid = selfAssessmentSubmitSchema.safeParse({
        ratings: [{ metricId: "m1", score: 4.5, comments: "Met all targets" }],
        selfComments: "Productive quarter overall.",
      });

      expect(valid.success).toBe(true);
    });

    it("rejects ratings out of 1-5 range", () => {
      const invalid = selfAssessmentSubmitSchema.safeParse({
        ratings: [{ metricId: "m1", score: 6.0 }],
      });

      expect(invalid.success).toBe(false);
    });

    it("validates manager evaluation with recommended grade", () => {
      const valid = managerEvaluationSubmitSchema.safeParse({
        ratings: [{ metricId: "m1", score: 5.0, comments: "Exceeded targets" }],
        managerComments: "Exceptional performance.",
        recommendedGrade: "A+",
      });

      expect(valid.success).toBe(true);
    });
  });

  describe("Goal Setting & RBAC Permissions", () => {
    it("validates goal creation payload", () => {
      const valid = performanceGoalCreateSchema.safeParse({
        title: "Publish 2 Research Papers",
        targetDate: "2026-12-31",
        progressPercentage: 50,
      });

      expect(valid.success).toBe(true);
    });

    it("verifies performance RBAC permissions across roles", () => {
      expect(hasPermission("admin", "performance:manage")).toBe(true);
      expect(hasPermission("principal", "performance:evaluate")).toBe(true);
      expect(hasPermission("hod", "performance:evaluate")).toBe(true);
      expect(hasPermission("staff", "performance:self")).toBe(true);
      expect(hasPermission("staff", "performance:manage")).toBe(false);
    });
  });
});
