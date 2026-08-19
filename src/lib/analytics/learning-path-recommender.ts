import { StudentRiskAssessment, RecommendedLearningPath } from "./types";

export class LearningPathRecommender {
  public generatePath(assessment: StudentRiskAssessment): RecommendedLearningPath {
    const { studentId, tenantId, riskLevel, primaryRiskDrivers, recommendations } = assessment;

    let pathTitle = "Standard Academic Track";
    let priority: "HIGH" | "MEDIUM" | "LOW" = "LOW";
    let targetCompletionDays = 30;

    if (riskLevel === "HIGH") {
      pathTitle = "Intensive Academic Remediation Path";
      priority = "HIGH";
      targetCompletionDays = 14;
    } else if (riskLevel === "MEDIUM") {
      pathTitle = "Targeted Academic Support Path";
      priority = "MEDIUM";
      targetCompletionDays = 21;
    }

    const suggestedActionItems = [
      ...recommendations,
      `Weekly progress check-in based on drivers: ${primaryRiskDrivers.join(", ") || "General"}`,
    ];

    return {
      studentId,
      tenantId,
      pathTitle,
      priority,
      suggestedActionItems,
      targetCompletionDays,
      createdAt: Date.now(),
    };
  }
}
