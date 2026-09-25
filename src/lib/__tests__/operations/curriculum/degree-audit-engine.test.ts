import { DegreeAuditEngine } from '../../../operations/curriculum/audit/degree-audit-engine';
import { CurriculumProgramDto, CurriculumCourseDto } from '../../../operations/curriculum/curriculum-types';
import { AuditCourseRecord } from '../../../operations/curriculum/audit/audit-types';

describe('Deterministic Degree Audit Engine (ADVISE-008)', () => {
  const mockProgram: CurriculumProgramDto = {
    id: 'prog_cs',
    programCode: 'CS_BS',
    title: 'B.S. in Computer Science',
    degreeType: 'bachelor',
    totalCreditsRequired: 120,
    minimumGpa: 2.0,
    catalogYear: '2026-2027',
    status: 'active',
    curriculumComplexityIndex: 12.5,
    institutionId: 'inst_1',
    createdAt: '',
    updatedAt: '',
  };

  const mockCatalog: CurriculumCourseDto[] = [
    { id: 'c1', courseCode: 'CS101', title: 'Intro to Programming', credits: 4, level: 100, courseType: 'major_core', minGrade: 'C', typicalTerm: 1, historicalPassRate: 0.9, blockingFactor: 2, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'c2', courseCode: 'CS102', title: 'Data Structures', credits: 4, level: 100, courseType: 'major_core', minGrade: 'C', typicalTerm: 2, historicalPassRate: 0.85, blockingFactor: 1, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'c3', courseCode: 'CS201', title: 'Algorithms', credits: 4, level: 200, courseType: 'major_core', minGrade: 'C', typicalTerm: 3, historicalPassRate: 0.8, blockingFactor: 0, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'e1', courseCode: 'CS450', title: 'Machine Learning', credits: 3, level: 400, courseType: 'major_elective', minGrade: 'C', typicalTerm: 7, historicalPassRate: 0.9, blockingFactor: 0, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'g1', courseCode: 'ENG101', title: 'College Composition', credits: 3, level: 100, courseType: 'gen_ed', minGrade: 'D', typicalTerm: 1, historicalPassRate: 0.95, blockingFactor: 0, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
  ];

  it('should evaluate completed degree requirements and identify outstanding deficits', () => {
    const engine = new DegreeAuditEngine();

    const studentTranscript: AuditCourseRecord[] = [
      { courseCode: 'CS101', title: 'Intro to Programming', credits: 4, grade: 'A', qualityPoints: 16, status: 'completed' },
      { courseCode: 'CS102', title: 'Data Structures', credits: 4, grade: 'B+', qualityPoints: 13.2, status: 'completed' },
      { courseCode: 'ENG101', title: 'College Composition', credits: 3, grade: 'A', qualityPoints: 12, status: 'completed' },
    ];

    const report = engine.executeAudit('stud_123', mockProgram, mockCatalog, studentTranscript, ['CS201']);

    expect(report.studentId).toBe('stud_123');
    expect(report.totalEarnedCredits).toBe(11);
    expect(report.totalInProgressCredits).toBeGreaterThan(0);
    expect(report.cumulativeGpa).toBeGreaterThan(3.5);
    expect(report.isGraduationEligible).toBe(false); // Incomplete credits & missing CS201

    // Major Core status
    const majorCore = report.categories.find((c) => c.categoryType === 'major_core');
    expect(majorCore).toBeDefined();
    expect(majorCore?.earnedCredits).toBe(8); // CS101 + CS102
    expect(majorCore?.inProgressCredits).toBe(4); // CS201
    expect(report.merkleAuditHash).toBeDefined();
    expect(report.merkleAuditHash.length).toBe(64);
  });
});
