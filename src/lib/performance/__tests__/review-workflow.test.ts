import { ReviewWorkflowService } from "../review-workflow-service";

describe("Review Workflow Engine Logic", () => {
  it("calculates final score average accurately", () => {
    const ratings = [
      { metricId: "m1", score: 4.0 },
      { metricId: "m2", score: 5.0 },
      { metricId: "m3", score: 4.5 },
    ];
    const score = ReviewWorkflowService.calculateFinalScore(ratings);
    expect(score).toBe(4.5);
  });

  it("assigns appropriate letter grades based on scores", () => {
    expect(ReviewWorkflowService.calculateGrade(4.8)).toBe("A+");
    expect(ReviewWorkflowService.calculateGrade(4.2)).toBe("A");
    expect(ReviewWorkflowService.calculateGrade(3.5)).toBe("B");
    expect(ReviewWorkflowService.calculateGrade(2.5)).toBe("C");
    expect(ReviewWorkflowService.calculateGrade(1.5)).toBe("D");
  });

  it("handles empty ratings array gracefully", () => {
    expect(ReviewWorkflowService.calculateFinalScore([])).toBe(0);
  });
});
