import { AdvisingCitation } from './advising-types';

export interface AcademicPolicyDocument {
  id: string;
  title: string;
  section: string;
  catalogYear: string;
  content: string;
  tags: string[];
  institutionId: string;
}

export class PolicyRetriever {
  private static instance: PolicyRetriever;
  private documents: AcademicPolicyDocument[] = [];

  constructor() {
    this.seedDefaultPolicies();
  }

  public static getInstance(): PolicyRetriever {
    if (!PolicyRetriever.instance) {
      PolicyRetriever.instance = new PolicyRetriever();
    }
    return PolicyRetriever.instance;
  }

  public seedDefaultPolicies(): void {
    this.documents = [
      {
        id: 'pol_1',
        title: 'Undergraduate Graduation Requirements Bylaws',
        section: 'Section 4.1 — Degree Credit Requirements',
        catalogYear: '2026-2027',
        content: 'Candidates for a baccalaureate degree must successfully complete a minimum of 120 credit hours with a cumulative grade point average of 2.00 or higher and meet all major core prerequisites.',
        tags: ['credits', 'graduation', 'gpa', 'degree', 'baccalaureate'],
        institutionId: 'global',
      },
      {
        id: 'pol_2',
        title: 'Academic Standing, Warning, and Probation Policy',
        section: 'Section 5.2 — Grade Replacement & Probation Removal',
        catalogYear: '2026-2027',
        content: 'Undergraduate students whose cumulative GPA falls below 2.00 are placed on academic probation. Repeating a course with a grade of C or higher replaces the prior grade for GPA computation.',
        tags: ['probation', 'recovery', 'retake', 'repeat', 'failing', 'gpa'],
        institutionId: 'global',
      },
      {
        id: 'pol_3',
        title: 'Transfer Credit and Articulation Guidelines',
        section: 'Article 3 — Undergraduate Transfer Guidelines',
        catalogYear: '2026-2027',
        content: 'A maximum of 60 lower-division semester credits from regionally accredited institutions may be applied toward undergraduate degree requirements provided grades earned are C or higher.',
        tags: ['transfer', 'articulation', 'waiver', 'ap credit', 'equivalency'],
        institutionId: 'global',
      },
      {
        id: 'pol_4',
        title: 'Full-Time Enrollment and Credit Overload Policy',
        section: 'Section 2.4 — Full-Time Status & Overloads',
        catalogYear: '2026-2027',
        content: 'Undergraduate full-time tuition covers 12 to 18 credit hours per semester. Course loads exceeding 18 credits incur per-credit overload fees and require Dean approval.',
        tags: ['credit load', 'overload', 'underload', 'full time', 'scholarship', 'financial aid'],
        institutionId: 'global',
      },
      {
        id: 'pol_5',
        title: 'Technical Concentrations and Electives Guideline',
        section: 'Section 8.3 — Technical Specializations',
        catalogYear: '2026-2027',
        content: 'Students wishing to pursue specialized career pathways are advised to select a cohesive 12-credit upper-division elective cluster in areas like AI, Cloud Computing, or Cyber Security.',
        tags: ['career', 'electives', 'concentration', 'job', 'specialization', 'ai'],
        institutionId: 'global',
      },
    ];
  }

  public retrievePolicies(
    query: string,
    institutionId: string = 'global',
    catalogYear?: string
  ): AdvisingCitation[] {
    const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const results: Array<{ doc: AcademicPolicyDocument; score: number }> = [];

    for (const doc of this.documents) {
      if (doc.institutionId !== 'global' && doc.institutionId !== institutionId) {
        continue;
      }
      if (catalogYear && doc.catalogYear !== catalogYear) {
        // slight penalty for older catalog years
      }

      let score = 0;
      const lowerContent = doc.content.toLowerCase();
      const lowerTitle = doc.title.toLowerCase();

      for (const token of tokens) {
        if (lowerTitle.includes(token)) score += 3.0;
        if (doc.tags.some((tag) => tag.includes(token))) score += 2.5;
        if (lowerContent.includes(token)) score += 1.0;
      }

      if (score > 0) {
        results.push({ doc, score });
      }
    }

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, 3).map(({ doc }) => ({
      documentTitle: doc.title,
      section: doc.section,
      excerpt: doc.content,
      catalogYear: doc.catalogYear,
    }));
  }
}

export const policyRetriever = PolicyRetriever.getInstance();
