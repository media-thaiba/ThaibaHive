import {
  competencyFrameworkCreateSchema,
  evaluationFormCreateSchema,
  performanceCycleCreateSchema,
} from "@/lib/validation/schemas";

describe("Performance Frameworks & Cycles API Validation", () => {
  it("validates competency framework payload structure", () => {
    const valid = competencyFrameworkCreateSchema.safeParse({
      name: "Engineering & Technical Competencies",
      roleScope: "staff",
      metricsJson: JSON.stringify([
        { id: "m1", title: "Code Quality", weight: 30 },
        { id: "m2", title: "System Architecture", weight: 30 },
      ]),
    });
    expect(valid.success).toBe(true);

    const invalid = competencyFrameworkCreateSchema.safeParse({
      name: "",
      metricsJson: "",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates evaluation form template creation payload", () => {
    const valid = evaluationFormCreateSchema.safeParse({
      frameworkId: "fw_901",
      title: "Annual Software Engineer Evaluation",
      description: "Standard annual rubric for tech staff",
      metricsConfigJson: JSON.stringify([{ metricId: "m1", ratingScale: "1-5" }]),
      ratingScale: "1-5",
    });
    expect(valid.success).toBe(true);
  });

  it("validates performance review cycle creation payload", () => {
    const valid = performanceCycleCreateSchema.safeParse({
      title: "2026 Q4 Faculty Appraisal",
      cycleType: "quarterly",
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      selfAssessmentDeadline: "2026-11-15",
      managerReviewDeadline: "2026-11-30",
    });
    expect(valid.success).toBe(true);
  });
});
