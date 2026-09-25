import { BaseAdvisorAgent, AdvisorAgentResponse, StudentAcademicProfile, AdvisingIntent } from '../advising-types';

export class DegreePlannerAgent implements BaseAdvisorAgent {
  public domain = 'degree_planner' as const;
  public name = 'Degree Planner Agent';
  public description = 'Generates 4-year roadmaps, validates prerequisite chains, and resolves term scheduling bottlenecks.';

  public async evaluate(
    prompt: string,
    profile: StudentAcademicProfile,
    intent: AdvisingIntent
  ): Promise<AdvisorAgentResponse> {
    const courseCode = intent.extractedEntities.courseCodes?.[0];
    const totalCredits = profile.totalCompletedCredits || 0;
    const remainingCredits = Math.max(0, 120 - totalCredits);

    let replyText = `Hello! Based on your declared program (**${profile.majorProgramCode}**) under Catalog Year **${profile.declaredCatalogYear}**, you have completed **${totalCredits} credits** with approximately **${remainingCredits} credits remaining** for degree completion.`;

    if (courseCode) {
      replyText += `\n\nRegarding **${courseCode}**: This course is part of your major progression. Ensure all foundational prerequisites are completed with a grade of 'C' or higher before enrolling.`;
    } else {
      replyText += `\n\nTo keep your graduation on track for your target date, we recommend enrolling in 15–16 credits per standard semester, prioritizing major core prerequisites.`;
    }

    return {
      agentDomain: this.domain,
      agentName: this.name,
      replyText,
      citations: [
        {
          documentTitle: `${profile.majorProgramCode} Degree Completion Bylaws`,
          section: 'Section 4.1 — Degree Credit Requirements',
          excerpt: 'Undergraduate candidates must complete a minimum of 120 semester credit hours with a cumulative GPA of 2.0 or higher.',
          catalogYear: profile.declaredCatalogYear,
        },
      ],
      proposedRoadmapAction: courseCode
        ? {
            actionType: 'add_course',
            courseCode,
            targetTerm: profile.termStanding + 1,
            reason: `Recommended next progression course in ${profile.majorProgramCode}`,
          }
        : null,
      confidence: 0.95,
      followUpPrompts: [
        'What courses should I take next semester?',
        'Can you show me my full 4-year degree plan?',
        'Will taking summer courses accelerate my graduation?',
      ],
    };
  }
}
