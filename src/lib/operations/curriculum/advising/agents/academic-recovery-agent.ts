import { BaseAdvisorAgent, AdvisorAgentResponse, StudentAcademicProfile, AdvisingIntent } from '../advising-types';

export class AcademicRecoveryAgent implements BaseAdvisorAgent {
  public domain = 'academic_recovery' as const;
  public name = 'Academic Recovery & Probation Agent';
  public description = 'Constructs personalized GPA rehabilitation roadmaps, course retake strategies, and tutoring triage.';

  public async evaluate(
    prompt: string,
    profile: StudentAcademicProfile,
    intent: AdvisingIntent
  ): Promise<AdvisorAgentResponse> {
    const isProbation = profile.cumulativeGpa < 2.0 || profile.academicStanding === 'academic_probation';
    const failedCourse = intent.extractedEntities.courseCodes?.[0];

    let replyText = `We are here to support your academic success and help you return to good standing. `;

    if (isProbation) {
      replyText += `Your current GPA is **${profile.cumulativeGpa.toFixed(2)}** (below the 2.00 threshold for good standing).\n\n` +
        `**Academic Recovery Strategy**:\n` +
        `1. **Repeat Forgiveness Policy**: Retaking failed or 'D' grade courses replaces the previous grade in GPA calculations.\n` +
        `2. **Balanced Term Load**: Limit enrollment to 12–13 credits next semester to focus on mastering key concepts.\n` +
        `3. **Peer Tutoring Enrollment**: Free peer tutoring sessions are automatically reserved for your enrolled courses.`;
    } else {
      replyText += `Your current GPA is **${profile.cumulativeGpa.toFixed(2)}**. If you experienced difficulty in a recent course, our repeat policy allows you to retake it to improve your mastery and grade.`;
    }

    if (failedCourse) {
      replyText += `\n\nWe recommend prioritizing a retake of **${failedCourse}** in your next available term.`;
    }

    return {
      agentDomain: this.domain,
      agentName: this.name,
      replyText,
      citations: [
        {
          documentTitle: 'Academic Standing & Probation Recovery Bylaws',
          section: 'Section 5.2 — Grade Replacement & Probation Removal',
          excerpt: 'Students with a cumulative GPA below 2.0 are placed on academic notice. Repeating a course with a higher grade replaces the previous attempt in the GPA calculation.',
          catalogYear: profile.declaredCatalogYear,
        },
      ],
      proposedRoadmapAction: failedCourse
        ? {
            actionType: 'add_course',
            courseCode: failedCourse,
            targetTerm: profile.termStanding + 1,
            reason: `Course retake for GPA grade replacement and prerequisite clearance`,
          }
        : null,
      confidence: 0.96,
      followUpPrompts: [
        'How does grade replacement calculate in my GPA?',
        'How do I schedule a session with the tutoring center?',
        'What GPA do I need next term to exit probation?',
      ],
    };
  }
}
