import { CurricularDagSolver } from '../../../operations/curriculum/graph/curricular-dag-solver';
import { PrerequisiteValidator } from '../../../operations/curriculum/graph/prerequisite-validator';
import { CurriculumCourseDto, CurriculumPrerequisiteDto, CurriculumDegreePlanDto, CurriculumPlanCourseDto } from '../../../operations/curriculum/curriculum-types';

describe('Curricular DAG Solver & Prerequisite Validator (ADVISE-003)', () => {
  const mockCourses: CurriculumCourseDto[] = [
    { id: 'c1', courseCode: 'CS101', title: 'Intro to CS', credits: 4, level: 100, courseType: 'major_core', minGrade: 'C', typicalTerm: 1, historicalPassRate: 0.9, blockingFactor: 3, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'c2', courseCode: 'CS102', title: 'Data Structures', credits: 4, level: 100, courseType: 'major_core', minGrade: 'C', typicalTerm: 2, historicalPassRate: 0.8, blockingFactor: 2, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'c3', courseCode: 'CS201', title: 'Algorithms', credits: 4, level: 200, courseType: 'major_core', minGrade: 'C', typicalTerm: 3, historicalPassRate: 0.75, blockingFactor: 1, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'c4', courseCode: 'CS301', title: 'Operating Systems', credits: 4, level: 300, courseType: 'major_core', minGrade: 'C', typicalTerm: 4, historicalPassRate: 0.7, blockingFactor: 0, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'm1', courseCode: 'MATH101', title: 'Calculus I', credits: 4, level: 100, courseType: 'gen_ed', minGrade: 'C', typicalTerm: 1, historicalPassRate: 0.85, blockingFactor: 1, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'm2', courseCode: 'MATH102', title: 'Discrete Math', credits: 3, level: 100, courseType: 'major_core', minGrade: 'C', typicalTerm: 2, historicalPassRate: 0.8, blockingFactor: 1, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
  ];

  const mockPrereqs: CurriculumPrerequisiteDto[] = [
    { id: 'p1', courseId: 'c2', prerequisiteCourseId: 'c1', type: 'hard_prerequisite', minimumGrade: 'C', concurrencyAllowed: false, institutionId: 'inst_1', createdAt: '' }, // CS101 -> CS102
    { id: 'p2', courseId: 'c3', prerequisiteCourseId: 'c2', type: 'hard_prerequisite', minimumGrade: 'C', concurrencyAllowed: false, institutionId: 'inst_1', createdAt: '' }, // CS102 -> CS201
    { id: 'p3', courseId: 'c3', prerequisiteCourseId: 'm2', type: 'hard_prerequisite', minimumGrade: 'C', concurrencyAllowed: false, institutionId: 'inst_1', createdAt: '' }, // MATH102 -> CS201
    { id: 'p4', courseId: 'c4', prerequisiteCourseId: 'c3', type: 'hard_prerequisite', minimumGrade: 'C', concurrencyAllowed: false, institutionId: 'inst_1', createdAt: '' }, // CS201 -> CS301
    { id: 'p5', courseId: 'm2', prerequisiteCourseId: 'm1', type: 'hard_prerequisite', minimumGrade: 'C', concurrencyAllowed: false, institutionId: 'inst_1', createdAt: '' }, // MATH101 -> MATH102
  ];

  it('should compute topological order and critical path correctly for acyclic graph', () => {
    const solver = new CurricularDagSolver(mockCourses, mockPrereqs);
    const result = solver.solveTopologicalSort();

    expect(result.hasCycle).toBe(false);
    expect(result.sortedCourseIds).toHaveLength(6);

    // CS101 must come before CS102, which must come before CS201, which must come before CS301
    const idx101 = result.sortedCourseIds.indexOf('c1');
    const idx102 = result.sortedCourseIds.indexOf('c2');
    const idx201 = result.sortedCourseIds.indexOf('c3');
    const idx301 = result.sortedCourseIds.indexOf('c4');

    expect(idx101).toBeLessThan(idx102);
    expect(idx102).toBeLessThan(idx201);
    expect(idx201).toBeLessThan(idx301);

    // Critical path chain length
    expect(result.criticalPathLength).toBe(4); // CS101 -> CS102 -> CS201 -> CS301
    expect(result.criticalPath).toContain('CS101');
    expect(result.criticalPath).toContain('CS301');
    expect(result.complexityIndex).toBeGreaterThan(0);
  });

  it('should detect cycles and return cycle path', () => {
    // Add cycle: CS301 -> CS101
    const cyclicPrereqs: CurriculumPrerequisiteDto[] = [
      ...mockPrereqs,
      { id: 'p_cycle', courseId: 'c1', prerequisiteCourseId: 'c4', type: 'hard_prerequisite', minimumGrade: 'C', concurrencyAllowed: false, institutionId: 'inst_1', createdAt: '' },
    ];

    const solver = new CurricularDagSolver(mockCourses, cyclicPrereqs);
    const result = solver.solveTopologicalSort();

    expect(result.hasCycle).toBe(true);
    expect(result.cyclePath).toBeDefined();
    expect(result.cyclePath!.length).toBeGreaterThan(0);
  });

  it('should validate student degree plans and detect missing prerequisite violations', () => {
    const validator = new PrerequisiteValidator(mockCourses, mockPrereqs);

    const mockPlan: CurriculumDegreePlanDto = {
      id: 'p_1',
      planId: 'plan_1',
      studentId: 'stud_1',
      programId: 'prog_1',
      title: 'Valid Plan',
      targetGraduationTerm: 'Spring 2030',
      totalTerms: 8,
      status: 'draft',
      merkleAuditHash: '',
      institutionId: 'inst_1',
      createdAt: '',
      updatedAt: '',
    };

    // Valid plan
    const validPlanCourses: CurriculumPlanCourseDto[] = [
      { id: 'pc1', planId: 'plan_1', courseId: 'c1', plannedTermIndex: 1, termName: 'Term 1', credits: 4, status: 'planned', isPrerequisiteSatisfied: true, institutionId: 'inst_1', createdAt: '', updatedAt: '' },
      { id: 'pc2', planId: 'plan_1', courseId: 'm1', plannedTermIndex: 1, termName: 'Term 1', credits: 4, status: 'planned', isPrerequisiteSatisfied: true, institutionId: 'inst_1', createdAt: '', updatedAt: '' },
      { id: 'pc3', planId: 'plan_1', courseId: 'c2', plannedTermIndex: 2, termName: 'Term 2', credits: 4, status: 'planned', isPrerequisiteSatisfied: true, institutionId: 'inst_1', createdAt: '', updatedAt: '' },
      { id: 'pc4', planId: 'plan_1', courseId: 'm2', plannedTermIndex: 2, termName: 'Term 2', credits: 3, status: 'planned', isPrerequisiteSatisfied: true, institutionId: 'inst_1', createdAt: '', updatedAt: '' },
      { id: 'pc5', planId: 'plan_1', courseId: 'c3', plannedTermIndex: 3, termName: 'Term 3', credits: 4, status: 'planned', isPrerequisiteSatisfied: true, institutionId: 'inst_1', createdAt: '', updatedAt: '' },
      { id: 'pc6', planId: 'plan_1', courseId: 'c4', plannedTermIndex: 4, termName: 'Term 4', credits: 4, status: 'planned', isPrerequisiteSatisfied: true, institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    ];

    const validResult = validator.validatePlan(mockPlan, validPlanCourses);
    expect(validResult.isValid).toBe(true);
    expect(validResult.violations).toHaveLength(0);

    // Invalid plan: CS201 placed in Term 1 before CS102 and CS101
    const invalidPlanCourses: CurriculumPlanCourseDto[] = [
      { id: 'pc_inv1', planId: 'plan_1', courseId: 'c3', plannedTermIndex: 1, termName: 'Term 1', credits: 4, status: 'planned', isPrerequisiteSatisfied: true, institutionId: 'inst_1', createdAt: '', updatedAt: '' },
      { id: 'pc_inv2', planId: 'plan_1', courseId: 'c1', plannedTermIndex: 2, termName: 'Term 2', credits: 4, status: 'planned', isPrerequisiteSatisfied: true, institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    ];

    const invalidResult = validator.validatePlan(mockPlan, invalidPlanCourses);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.violations.length).toBeGreaterThan(0);
    expect(invalidResult.violations[0].violationType).toBe('missing_prerequisite');
  });
});
