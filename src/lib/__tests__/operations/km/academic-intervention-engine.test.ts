import { academicInterventionEngine } from '@/lib/operations/km/advising/academic-intervention-engine';
import { careerMatcher } from '@/lib/operations/km/advising/career-matcher';
import { StudentTranscriptEntry } from '@/lib/operations/km/advising/advising-types';
import { kmStore } from '@/lib/db/km-store';

describe('Academic Intervention Engine & Career Matcher (KM-010)', () => {
  beforeEach(() => {
    kmStore.clearMemoryStore();
  });

  it('should flag students with multiple course failures for critical intervention', async () => {
    const strugglingTranscript: StudentTranscriptEntry[] = [
      { courseCode: 'CS-101', courseTitle: 'Intro to CS', credits: 4, grade: 'F', term: 'Fall 2024' },
      { courseCode: 'MATH-101', courseTitle: 'Calculus I', credits: 4, grade: 'F', term: 'Fall 2024' },
    ];

    const evalResult = academicInterventionEngine.evaluateStudentRisk('std_struggle', strugglingTranscript, 60);

    expect(evalResult.riskTier).toBe('critical_intervention');
    expect(evalResult.requiresAdvisorEscalation).toBe(true);

    const saved = await academicInterventionEngine.recordIntervention(evalResult);
    expect(saved.status).toBe('in_review');
  });

  it('should match student course profile to career archetypes', () => {
    const aiStudentTranscript: StudentTranscriptEntry[] = [
      { courseCode: 'CS-101', courseTitle: 'Intro to CS', credits: 4, grade: 'A', term: 'Fall 2024' },
      { courseCode: 'CS-401', courseTitle: 'AI', credits: 4, grade: 'A', term: 'Spring 2025' },
      { courseCode: 'CS-402', courseTitle: 'Machine Learning', credits: 4, grade: 'A-', term: 'Fall 2025' },
    ];

    const careerMatches = careerMatcher.matchStudentToCareers(aiStudentTranscript);

    expect(careerMatches.length).toBeGreaterThan(0);
    expect(careerMatches[0].career.title).toBe('AI & Machine Learning Engineer');
    expect(careerMatches[0].matchingCourses).toContain('CS-401');
  });
});
