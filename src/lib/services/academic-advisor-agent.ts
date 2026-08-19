import { agentReasoningEngine, CopilotRecommendationRecord } from "./agent-reasoning-engine";

export interface AcademicStudentProfile {
  studentId: string;
  name: string;
  gradeLevel: string;
  recentExamScoreAvg: number;
  attendancePercentage: number;
  hasChronicAbsenteeismAlert?: boolean;
}

export class AcademicAdvisorAgent {
  readonly agentId = "agent_academic_advisor";
  readonly agentType = "academic_advisor";
  readonly domain = "academics";
  readonly name = "Academic Advisor Copilot";

  async analyzeAndRecommend(
    tenantId: string,
    studentProfiles: AcademicStudentProfile[],
    customQuery?: string
  ): Promise<CopilotRecommendationRecord> {
    const totalStudents = studentProfiles.length;
    const lowPerformers = studentProfiles.filter(s => s.recentExamScoreAvg < 60);
    const chronicAbsenteeismCount = studentProfiles.filter(s => s.hasChronicAbsenteeismAlert || s.attendancePercentage < 75).length;

    let title = "Academic Cohort Performance & Intervention Plan";
    let summary = `Analyzed ${totalStudents} students. Identified ${lowPerformers.length} students requiring academic support and ${chronicAbsenteeismCount} attendance concerns.`;
    let confidenceScore = 0.88;

    if (customQuery?.toLowerCase().includes("math")) {
      title = "Targeted Mathematics Remediation Plan";
      summary = `Custom Query Analysis: Recommended 3-week intensive math problem solving sessions for ${lowPerformers.length || 2} struggling students.`;
      confidenceScore = 0.92;
    }

    const suggestedAction = {
      actionType: "create_remediation_ticket",
      category: "academics",
      severity: lowPerformers.length > 5 ? "high" : "medium",
      affectedStudentIds: lowPerformers.map(s => s.studentId),
      recommendedIntervention: "Peer Tutoring & Parent Academic Counseling",
    };

    return agentReasoningEngine.processReasoningAndGenerateRecommendation({
      tenantId,
      agentId: this.agentId,
      domain: this.domain,
      title,
      summary,
      contextData: {
        totalStudents,
        lowPerformersCount: lowPerformers.length,
        chronicAbsenteeismCount,
        customQuery,
      },
      suggestedAction,
      confidenceScore,
    });
  }
}

export const academicAdvisorAgent = new AcademicAdvisorAgent();
