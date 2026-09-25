import { CurriculumCourseDto } from '../curriculum-types';
import { ParsedExternalCourse, SemanticMatchRecommendation } from './articulation-types';

export class SemanticArticulationMatcher {
  /**
   * Matches external courses against internal curriculum catalog
   */
  public matchCourse(
    external: ParsedExternalCourse,
    catalog: CurriculumCourseDto[]
  ): SemanticMatchRecommendation {
    let bestMatch: CurriculumCourseDto | null = null;
    let highestScore = 0.0;

    const extTitleWords = this.tokenize(external.sourceTitle);
    const extCodeNumber = external.sourceCourseCode.replace(/\D/g, '');

    for (const internal of catalog) {
      const intTitleWords = this.tokenize(internal.title);
      const intCodeNumber = internal.courseCode.replace(/\D/g, '');

      // 1. Title Jaccard / Token similarity
      const intersection = extTitleWords.filter((w) => intTitleWords.includes(w));
      const union = Array.from(new Set([...extTitleWords, ...intTitleWords]));
      const titleSim = union.length > 0 ? intersection.length / union.length : 0;

      // 2. Course Code number alignment bonus
      let codeBonus = 0;
      if (extCodeNumber && intCodeNumber && extCodeNumber === intCodeNumber) {
        codeBonus = 0.25;
      } else if (extCodeNumber && intCodeNumber && Math.abs(parseInt(extCodeNumber) - parseInt(intCodeNumber)) <= 10) {
        codeBonus = 0.15;
      }

      // 3. Credits match bonus
      let creditBonus = 0;
      if (Math.abs(external.sourceCredits - internal.credits) <= 0.5) {
        creditBonus = 0.15;
      }

      const totalSimilarity = Math.min(1.0, titleSim * 0.6 + codeBonus + creditBonus);

      if (totalSimilarity > highestScore) {
        highestScore = totalSimilarity;
        bestMatch = internal;
      }
    }

    const roundedScore = Math.round(highestScore * 100) / 100;

    // Minimum grade threshold for transfer credit
    const isPassing = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'PASS', 'CR'].includes(external.sourceGrade);
    if (!isPassing) {
      return {
        sourceCourse: external,
        semanticSimilarityScore: roundedScore,
        recommendationType: 'rejected',
        rationale: `Grade ${external.sourceGrade} does not meet minimum transfer grade requirement of 'C'.`,
      };
    }

    if (roundedScore >= 0.75 && bestMatch) {
      return {
        sourceCourse: external,
        targetCourseId: bestMatch.id,
        targetCourseCode: bestMatch.courseCode,
        targetCourseTitle: bestMatch.title,
        semanticSimilarityScore: roundedScore,
        recommendationType: 'exact_equivalent',
        rationale: `High semantic alignment (${Math.round(roundedScore * 100)}%) with ${bestMatch.courseCode} (${bestMatch.title}).`,
      };
    } else if (roundedScore >= 0.50 && bestMatch) {
      return {
        sourceCourse: external,
        targetCourseId: bestMatch.id,
        targetCourseCode: bestMatch.courseCode,
        targetCourseTitle: bestMatch.title,
        semanticSimilarityScore: roundedScore,
        recommendationType: 'department_review',
        rationale: `Moderate semantic overlap (${Math.round(roundedScore * 100)}%). Requires departmental faculty review.`,
      };
    }

    return {
      sourceCourse: external,
      semanticSimilarityScore: roundedScore,
      recommendationType: 'general_elective',
      rationale: 'No direct major course equivalency found. Recommended for general elective credit.',
    };
  }

  private tokenize(text: string): string[] {
    const stopWords = new Set(['intro', 'to', 'and', 'the', 'of', 'in', 'for', 'a', 'an']);
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !stopWords.has(w));
  }
}
