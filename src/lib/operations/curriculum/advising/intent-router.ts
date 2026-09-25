import { AdvisingDomain } from '../curriculum-types';
import { AdvisingIntent } from './advising-types';

export class AdvisingIntentRouter {
  /**
   * Classifies user prompt into an advising domain with entity extraction
   */
  public routeIntent(prompt: string): AdvisingIntent {
    const lower = prompt.toLowerCase();

    // Entity extraction: Course codes (e.g. CS101, MATH201, BIO-102)
    const courseCodeRegex = /\b([A-Z]{2,5}\s?[-]?\d{3,4}[A-Z]?)\b/gi;
    const matchedCourses: string[] = [];
    let match;
    while ((match = courseCodeRegex.exec(prompt)) !== null) {
      matchedCourses.push(match[1].replace(/\s+|-/g, '').toUpperCase());
    }

    // Domain Scoring
    let recoveryScore = 0;
    let transferScore = 0;
    let finAidScore = 0;
    let careerScore = 0;
    let plannerScore = 0;

    // Academic Recovery indicators
    if (/\b(probation|failing|failed|retake|low gpa|poor grade|academic warning|dismissal|struggling)\b/i.test(lower)) {
      recoveryScore += 3.5;
    }

    // Transfer Articulation indicators
    if (/\b(transfer|prior credit|previous institution|community college|ap credit|articulation|equivalent|waiver|substitute)\b/i.test(lower)) {
      transferScore += 3.5;
    }

    // Financial Aid & Credit Load indicators
    if (/\b(credit load|overload|underload|full[- ]time|part[- ]time|scholarship|financial aid|12 credits|18 credits|tuition)\b/i.test(lower)) {
      finAidScore += 3.5;
    }

    // Career Alignment indicators
    if (/\b(career|job|industry|software engineer|data scientist|ai engineer|specialize|concentration|track|market|hire)\b/i.test(lower)) {
      careerScore += 3.5;
    }

    // Degree Planning & Scheduling indicators
    if (/\b(plan|degree|roadmap|schedule|graduate|graduation|prerequisite|sequence|next term|4 year|four year)\b/i.test(lower)) {
      plannerScore += 3.0;
    }

    // Secondary scoring based on keywords
    if (lower.includes('grade') || lower.includes('repeat')) recoveryScore += 1.0;
    if (lower.includes('credits') && !lower.includes('transfer')) finAidScore += 1.0;
    if (lower.includes('electives')) careerScore += 1.5;
    if (lower.includes('term') || lower.includes('semester')) plannerScore += 1.0;

    // Default to degree_planner if no domain strongly matches
    const scores: Array<{ domain: AdvisingDomain; score: number; rationale: string }> = [
      { domain: 'academic_recovery', score: recoveryScore, rationale: 'Detected academic standing, failure, or recovery keywords' },
      { domain: 'transfer_articulation', score: transferScore, rationale: 'Detected transfer credit or prior institution keywords' },
      { domain: 'financial_aid_load', score: finAidScore, rationale: 'Detected credit load, overload, or financial aid terms' },
      { domain: 'career_alignment', score: careerScore, rationale: 'Detected career, specialization, or industry goal inquiry' },
      { domain: 'degree_planner', score: plannerScore + 0.5, rationale: 'Detected general degree roadmap or prerequisite inquiry' },
    ];

    scores.sort((a, b) => b.score - a.score);
    const top = scores[0];

    const confidence = Math.min(0.98, Math.max(0.70, top.score > 3.0 ? 0.92 : 0.80));

    return {
      domain: top.domain,
      confidence,
      extractedEntities: {
        courseCodes: matchedCourses.length > 0 ? matchedCourses : undefined,
      },
      rationale: top.rationale,
    };
  }
}
