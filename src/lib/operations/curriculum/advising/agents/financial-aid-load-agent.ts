import { BaseAdvisorAgent, AdvisorAgentResponse, StudentAcademicProfile, AdvisingIntent } from '../advising-types';

export class FinancialAidLoadAgent implements BaseAdvisorAgent {
  public domain = 'financial_aid_load' as const;
  public name = 'Financial Aid & Credit Load Agent';
  public description = 'Monitors full-time credit enrollment bounds, tuition thresholds, and overload permission rules.';

  public async evaluate(
    _prompt: string,
    profile: StudentAcademicProfile,
    _intent: AdvisingIntent
  ): Promise<AdvisorAgentResponse> {
    const replyText = `Here is a summary of your credit enrollment and financial aid parameters:\n\n` +
      `- **Full-Time Threshold**: Minimum **12 credits/term** required to maintain institutional scholarships and full-time status.\n` +
      `- **Optimal Graduation Load**: **15–16 credits/term** balances degree velocity without risking overload burnout.\n` +
      `- **Credit Overload Limit**: Enrolling in **>18 credits** requires cumulative GPA $\\ge 3.0$ and Dean approval.\n` +
      `- **Current Academic Status**: Cumulative GPA **${profile.cumulativeGpa.toFixed(2)}** in **${profile.majorProgramCode}**.`;

    return {
      agentDomain: this.domain,
      agentName: this.name,
      replyText,
      citations: [
        {
          documentTitle: 'Academic Standing & Credit Load Policy',
          section: 'Section 2.4 — Full-Time Status & Overloads',
          excerpt: 'Undergraduate full-time tuition covers 12 to 18 credit hours per semester. Course loads exceeding 18 credits incur per-credit fees and require Dean approval.',
          catalogYear: profile.declaredCatalogYear,
        },
      ],
      proposedRoadmapAction: null,
      confidence: 0.94,
      followUpPrompts: [
        'How do I apply for a credit overload waiver?',
        'Will dropping a class affect my financial aid status?',
        'What is the refund deadline for dropped courses?',
      ],
    };
  }
}
