import { BaseAdvisorAgent, AdvisorAgentResponse, StudentAcademicProfile, AdvisingIntent } from '../advising-types';

export class TransferArticulationAgent implements BaseAdvisorAgent {
  public domain = 'transfer_articulation' as const;
  public name = 'Transfer Articulation Agent';
  public description = 'Evaluates external college transcripts, AP/IB test scores, and applies course waiver equivalencies.';

  public async evaluate(
    prompt: string,
    profile: StudentAcademicProfile,
    intent: AdvisingIntent
  ): Promise<AdvisorAgentResponse> {
    const courseCode = intent.extractedEntities.courseCodes?.[0];

    let replyText = `Transfer credit evaluations follow our institutional articulation bylaws. Prior coursework with a grade of 'C' (2.0) or higher from accredited institutions is eligible for transfer.\n\n`;

    if (courseCode) {
      replyText += `For **${courseCode}**: If you took an equivalent course at your previous institution, upload the course syllabus to our Transfer Vault for automated OCR parsing and semantic equivalence matching.`;
    } else {
      replyText += `To evaluate your credits, please submit your official transcript via the Transfer Articulation portal. Up to 60 lower-division credits may be transferred toward your bachelor degree.`;
    }

    return {
      agentDomain: this.domain,
      agentName: this.name,
      replyText,
      citations: [
        {
          documentTitle: 'Institutional Transfer Credit Policy',
          section: 'Article 3 — Undergraduate Transfer Guidelines',
          excerpt: 'A maximum of 60 lower-division semester credits from regionally accredited institutions may be applied toward degree requirements.',
          catalogYear: profile.declaredCatalogYear,
        },
      ],
      proposedRoadmapAction: null,
      confidence: 0.90,
      followUpPrompts: [
        'How do I submit my transcript for evaluation?',
        'Does AP Computer Science count for CS101?',
        'What is the maximum number of transfer credits allowed?',
      ],
    };
  }
}
