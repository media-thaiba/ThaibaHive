import { AcademicAdvisorAgent, AcademicStudentProfile } from "../academic-advisor-agent";

describe("Sprint-011 Academic Advisor Copilot Agent", () => {
  let agent: AcademicAdvisorAgent;

  beforeEach(() => {
    agent = new AcademicAdvisorAgent();
  });

  it("analyzes student profiles and generates academic intervention recommendations", async () => {
    const profiles: AcademicStudentProfile[] = [
      { studentId: "std_101", name: "Alice", gradeLevel: "Grade 10", recentExamScoreAvg: 52, attendancePercentage: 88 },
      { studentId: "std_102", name: "Bob", gradeLevel: "Grade 10", recentExamScoreAvg: 85, attendancePercentage: 92 },
      { studentId: "std_103", name: "Charlie", gradeLevel: "Grade 10", recentExamScoreAvg: 58, attendancePercentage: 70, hasChronicAbsenteeismAlert: true },
    ];

    const rec = await agent.analyzeAndRecommend("inst_101", profiles);

    expect(rec.domain).toBe("academics");
    expect(rec.title).toContain("Academic Cohort Performance");
    expect(rec.suggestedAction).toBeDefined();
    expect(rec.confidenceScore).toBeGreaterThanOrEqual(0.85);
  });

  it("handles custom query for mathematics remediation", async () => {
    const profiles: AcademicStudentProfile[] = [
      { studentId: "std_101", name: "Alice", gradeLevel: "Grade 10", recentExamScoreAvg: 52, attendancePercentage: 88 },
    ];

    const rec = await agent.analyzeAndRecommend("inst_101", profiles, "Recommend math remediation");

    expect(rec.title).toContain("Mathematics Remediation Plan");
    expect(rec.confidenceScore).toBe(0.92);
  });
});
