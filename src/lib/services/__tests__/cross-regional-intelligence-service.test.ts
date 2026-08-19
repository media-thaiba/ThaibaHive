import { CrossRegionalIntelligenceService, CampusMetricsSummary } from "../cross-regional-intelligence-service";
import { CopilotRecommendationRecord } from "../agent-reasoning-engine";

describe("Sprint-011 Cross-Regional Intelligence Synthesis Engine", () => {
  let service: CrossRegionalIntelligenceService;

  beforeEach(() => {
    service = new CrossRegionalIntelligenceService();
  });

  it("synthesizes regional executive briefings across multi-campus networks", () => {
    const campuses: CampusMetricsSummary[] = [
      { campusId: "c1", campusName: "Main Campus", attendanceAvg: 92, academicPassRate: 94, feeRealizationRate: 96, complianceScore: 98 },
      { campusId: "c2", campusName: "West Campus", attendanceAvg: 78, academicPassRate: 72, feeRealizationRate: 80, complianceScore: 85 },
    ];

    const recs: CopilotRecommendationRecord[] = [
      {
        id: "rec_1",
        tenantId: "c2",
        agentId: "agent_academic_advisor",
        domain: "academics",
        title: "Academic Intervention Plan",
        summary: "Targeted support for West Campus",
        confidenceScore: 0.9,
        humanApprovalStatus: "AUTO_EXECUTE",
        createdAt: new Date().toISOString(),
      },
    ];

    const briefing = service.synthesizeExecutiveBriefing("reg_north_01", campuses, recs);

    expect(briefing.regionalGroupId).toBe("reg_north_01");
    expect(briefing.totalCampuses).toBe(2);
    expect(briefing.topPerformingCampus).toBe("Main Campus");
    expect(briefing.highestRiskCampus).toBe("West Campus");
    expect(briefing.averageComplianceScore).toBe(91.5);
    expect(briefing.crossCampusInsights.length).toBeGreaterThan(1);
  });
});
