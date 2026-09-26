import { BaseAdvisorAgent, AdvisorAgentResponse, StudentAcademicProfile, AdvisingIntent } from '../advising-types';

export class CareerAlignmentAgent implements BaseAdvisorAgent {
  public domain = 'career_alignment' as const;
  public name = 'Career Alignment Agent';
  public description = 'Aligns elective clusters and degree concentrations with industry career paths and labor market demands.';

  public async evaluate(
    prompt: string,
    profile: StudentAcademicProfile,
    _intent: AdvisingIntent
  ): Promise<AdvisorAgentResponse> {
    const lower = prompt.toLowerCase();
    let careerFocus = 'Software Engineering';

    if (lower.includes('ai') || lower.includes('machine learning') || lower.includes('data')) {
      careerFocus = 'Artificial Intelligence & Data Engineering';
    } else if (lower.includes('security') || lower.includes('cyber')) {
      careerFocus = 'Cybersecurity & Infrastructure';
    } else if (lower.includes('cloud') || lower.includes('devops')) {
      careerFocus = 'Cloud Architecture & DevOps';
    }

    const replyText = `For a targeted career in **${careerFocus}**, we recommend tailoring your upper-division major electives:\n\n` +
      `- **Recommended Elective Cluster**: Advanced Algorithms, Distributed Systems, Cloud Computing, Machine Learning Systems.\n` +
      `- **Industry Alignment**: Completing these electives satisfies ABET-accredited specialization requirements and prepares you for senior technical roles.`;

    return {
      agentDomain: this.domain,
      agentName: this.name,
      replyText,
      citations: [
        {
          documentTitle: 'Career Pathways & Elective Guide',
          section: 'Section 8.3 — Technical Specializations',
          excerpt: 'Students wishing to pursue high-demand technical roles are advised to choose cohesive 12-credit elective concentrations.',
          catalogYear: profile.declaredCatalogYear,
        },
      ],
      proposedRoadmapAction: {
        actionType: 'add_course',
        courseCode: 'CS450',
        targetTerm: profile.termStanding + 2,
        reason: `Aligns with ${careerFocus} specialization track`,
      },
      confidence: 0.92,
      followUpPrompts: [
        'Which concentrations have the highest hiring rates?',
        'Can I do an internship for academic elective credit?',
        'What prerequisite courses do I need for Machine Learning?',
      ],
    };
  }
}
