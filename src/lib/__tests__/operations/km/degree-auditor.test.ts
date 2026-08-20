import { degreeAuditor } from '@/lib/operations/km/advising/degree-auditor';
import { ProgramCurriculum, StudentTranscriptEntry } from '@/lib/operations/km/advising/advising-types';

describe('Autonomous Degree Progress Auditor (KM-008)', () => {
  const sampleCurriculum: ProgramCurriculum = {
    programId: 'prog_bscs',
    programCode: 'BS-CS',
    name: 'Bachelor of Science in Computer Science',
    departmentId: 'DEPT-CS',
    totalCreditsRequired: 20,
    minCumulativeGpa: 2.0,
    minMajorGpa: 2.0,
    requirementGroups: [
      {
        categoryId: 'core_cs',
        title: 'Core Computer Science',
        requiredCredits: 12,
        mandatoryCourseCodes: ['CS-101', 'CS-102', 'CS-201'],
      },
      {
        categoryId: 'electives',
        title: 'Major Electives',
        requiredCredits: 8,
        mandatoryCourseCodes: [],
        electiveCourseCodes: ['CS-301', 'CS-302', 'CS-401'],
      },
    ],
  };

  it('should evaluate completed transcript and compute accurate GPA and graduation eligibility', () => {
    const transcript: StudentTranscriptEntry[] = [
      { courseCode: 'CS-101', courseTitle: 'Intro to CS', credits: 4, grade: 'A', term: 'Fall 2024', isMajorCourse: true },
      { courseCode: 'CS-102', courseTitle: 'Data Structures', credits: 4, grade: 'B', term: 'Spring 2025', isMajorCourse: true },
      { courseCode: 'CS-201', courseTitle: 'Architecture', credits: 4, grade: 'A-', term: 'Fall 2025', isMajorCourse: true },
      { courseCode: 'CS-301', courseTitle: 'Operating Systems', credits: 4, grade: 'B+', term: 'Spring 2026', isMajorCourse: true },
      { courseCode: 'CS-401', courseTitle: 'Artificial Intelligence', credits: 4, grade: 'A', term: 'Fall 2026', isMajorCourse: true },
    ];

    const result = degreeAuditor.auditStudentDegree('std_123', transcript, sampleCurriculum);

    expect(result.totalCompletedCredits).toBe(20);
    expect(result.completionPercentage).toBe(100);
    expect(result.cumulativeGpa).toBeGreaterThan(3.4);
    expect(result.isGraduationEligible).toBe(true);
    expect(result.requirementsSummary.every((r) => r.isSatisfied)).toBe(true);
  });

  it('should identify unfulfilled core requirements for incomplete transcripts', () => {
    const transcript: StudentTranscriptEntry[] = [
      { courseCode: 'CS-101', courseTitle: 'Intro to CS', credits: 4, grade: 'A', term: 'Fall 2024', isMajorCourse: true },
    ];

    const result = degreeAuditor.auditStudentDegree('std_incomplete', transcript, sampleCurriculum);

    expect(result.totalCompletedCredits).toBe(4);
    expect(result.isGraduationEligible).toBe(false);
    expect(result.requirementsSummary[0].remainingCoursesNeeded).toContain('CS-102');
    expect(result.requirementsSummary[0].remainingCoursesNeeded).toContain('CS-201');
  });
});
