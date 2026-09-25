import { TransferCreditParser } from '../../../operations/curriculum/transfer/transfer-credit-parser';
import { SemanticArticulationMatcher } from '../../../operations/curriculum/transfer/semantic-articulation-matcher';
import { CurriculumCourseDto } from '../../../operations/curriculum/curriculum-types';

describe('Transfer Credit OCR Parser & Semantic Articulation Matcher (ADVISE-009)', () => {
  const mockCatalog: CurriculumCourseDto[] = [
    { id: 'c1', courseCode: 'CS101', title: 'Intro to Computer Science', credits: 4, level: 100, courseType: 'major_core', minGrade: 'C', typicalTerm: 1, historicalPassRate: 0.9, blockingFactor: 2, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'c2', courseCode: 'MATH151', title: 'Calculus I Analytic Geometry', credits: 4, level: 100, courseType: 'gen_ed', minGrade: 'C', typicalTerm: 1, historicalPassRate: 0.8, blockingFactor: 2, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'c3', courseCode: 'ENG101', title: 'College English Composition', credits: 3, level: 100, courseType: 'gen_ed', minGrade: 'D', typicalTerm: 1, historicalPassRate: 0.95, blockingFactor: 0, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
  ];

  it('should parse unstructured OCR transcript text into structured course objects', () => {
    const rawOcr = `
    Northern Metro Community College
    Student Name: Alex Mercer
    CS-101 Intro to Computer Science 4.0 A
    MATH-151 Calculus I Analytic Geometry 4.0 B+
    HIST-202 Western Civilization 3.0 F
    `;

    const parser = new TransferCreditParser();
    const result = parser.parseTranscriptText(rawOcr);

    expect(result.sourceInstitution).toContain('Northern Metro');
    expect(result.studentName).toBe('Alex Mercer');
    expect(result.courses).toHaveLength(3);
    expect(result.courses[0].sourceCourseCode).toBe('CS101');
    expect(result.courses[0].sourceGrade).toBe('A');
    expect(result.confidenceScore).toBeGreaterThan(0.9);
  });

  it('should compute semantic match score and recommend direct equivalency or review', () => {
    const parser = new TransferCreditParser();
    const matcher = new SemanticArticulationMatcher();

    const rawOcr = `
    Metro University
    CS-101 Intro to Computer Science 4.0 A
    ART-101 Introduction to Visual Painting 3.0 B
    `;
    const parsed = parser.parseTranscriptText(rawOcr);

    const csMatch = matcher.matchCourse(parsed.courses[0], mockCatalog);
    expect(csMatch.recommendationType).toBe('exact_equivalent');
    expect(csMatch.targetCourseCode).toBe('CS101');
    expect(csMatch.semanticSimilarityScore).toBeGreaterThan(0.7);

    const artMatch = matcher.matchCourse(parsed.courses[1], mockCatalog);
    expect(artMatch.recommendationType).toBe('general_elective');
  });

  it('should reject transfer credit with failing grade', () => {
    const matcher = new SemanticArticulationMatcher();
    const failingCourse = {
      sourceCourseCode: 'CS101',
      sourceTitle: 'Intro to Computer Science',
      sourceCredits: 4.0,
      sourceGrade: 'F',
    };

    const match = matcher.matchCourse(failingCourse, mockCatalog);
    expect(match.recommendationType).toBe('rejected');
    expect(match.rationale).toContain('does not meet minimum transfer grade');
  });
});
