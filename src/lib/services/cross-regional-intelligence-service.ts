import { CopilotRecommendationRecord } from "./agent-reasoning-engine";

export interface CampusMetricsSummary {
  campusId: string;
  campusName: string;
  attendanceAvg: number;
  academicPassRate: number;
  feeRealizationRate: number;
  complianceScore: number;
}

export interface RegionalExecutiveBriefing {
  regionalGroupId: string;
  totalCampuses: number;
  averageComplianceScore: number;
  topPerformingCampus: string;
  highestRiskCampus: string;
  crossCampusInsights: string[];
  recommendations: CopilotRecommendationRecord[];
}

export class CrossRegionalIntelligenceService {
  synthesizeExecutiveBriefing(
    regionalGroupId: string,
    campusSummaries: CampusMetricsSummary[],
    activeRecommendations: CopilotRecommendationRecord[]
  ): RegionalExecutiveBriefing {
    const totalCampuses = campusSummaries.length || 1;
    const avgCompliance = campusSummaries.reduce((sum, c) => sum + c.complianceScore, 0) / totalCampuses;

    const sortedByPerformance = [...campusSummaries].sort((a, b) => (b.academicPassRate + b.feeRealizationRate) - (a.academicPassRate + a.feeRealizationRate));
    const topPerforming = sortedByPerformance[0]?.campusName || "N/A";
    const highestRisk = sortedByPerformance[sortedByPerformance.length - 1]?.campusName || "N/A";

    const insights: string[] = [
      `Regional network contains ${totalCampuses} campuses with average compliance score of ${avgCompliance.toFixed(1)}%.`,
      `Top performing institution: ${topPerforming}. Requires risk oversight: ${highestRisk}.`,
    ];

    if (activeRecommendations.some(r => r.domain === "academics")) {
      insights.push("Academic interventions active across regional network.");
    }
    if (activeRecommendations.some(r => r.domain === "finance")) {
      insights.push("Financial controller budget reallocations pending review.");
    }

    return {
      regionalGroupId,
      totalCampuses,
      averageComplianceScore: parseFloat(avgCompliance.toFixed(2)),
      topPerformingCampus: topPerforming,
      highestRiskCampus: highestRisk,
      crossCampusInsights: insights,
      recommendations: activeRecommendations,
    };
  }
}

export const crossRegionalIntelligenceService = new CrossRegionalIntelligenceService();
