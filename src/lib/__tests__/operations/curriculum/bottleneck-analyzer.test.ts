import { BottleneckAnalyzer } from '../../../operations/curriculum/graph/bottleneck-analyzer';
import { GraduationSimulator } from '../../../operations/curriculum/graph/graduation-simulator';
import { CurriculumCourseDto, CurriculumPrerequisiteDto } from '../../../operations/curriculum/curriculum-types';

describe('Degree Bottleneck Analyzer & Cohort Graduation Simulator (ADVISE-004)', () => {
  const mockCourses: CurriculumCourseDto[] = [
    { id: 'c1', courseCode: 'CS101', title: 'Intro to Programming', credits: 4, level: 100, courseType: 'major_core', minGrade: 'C', typicalTerm: 1, historicalPassRate: 0.95, blockingFactor: 4, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'c2', courseCode: 'CS102', title: 'Data Structures', credits: 4, level: 100, courseType: 'major_core', minGrade: 'C', typicalTerm: 2, historicalPassRate: 0.65, blockingFactor: 3, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' }, // Major Bottleneck
    { id: 'c3', courseCode: 'CS201', title: 'Algorithms', credits: 4, level: 200, courseType: 'major_core', minGrade: 'C', typicalTerm: 3, historicalPassRate: 0.70, blockingFactor: 2, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'c4', courseCode: 'CS301', title: 'Operating Systems', credits: 4, level: 300, courseType: 'major_core', minGrade: 'C', typicalTerm: 4, historicalPassRate: 0.85, blockingFactor: 1, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
    { id: 'c5', courseCode: 'CS401', title: 'Senior Capstone', credits: 4, level: 400, courseType: 'major_core', minGrade: 'C', typicalTerm: 8, historicalPassRate: 0.98, blockingFactor: 0, status: 'active', institutionId: 'inst_1', createdAt: '', updatedAt: '' },
  ];

  const mockPrereqs: CurriculumPrerequisiteDto[] = [
    { id: 'p1', courseId: 'c2', prerequisiteCourseId: 'c1', type: 'hard_prerequisite', minimumGrade: 'C', concurrencyAllowed: false, institutionId: 'inst_1', createdAt: '' },
    { id: 'p2', courseId: 'c3', prerequisiteCourseId: 'c2', type: 'hard_prerequisite', minimumGrade: 'C', concurrencyAllowed: false, institutionId: 'inst_1', createdAt: '' },
    { id: 'p3', courseId: 'c4', prerequisiteCourseId: 'c3', type: 'hard_prerequisite', minimumGrade: 'C', concurrencyAllowed: false, institutionId: 'inst_1', createdAt: '' },
    { id: 'p4', courseId: 'c5', prerequisiteCourseId: 'c4', type: 'hard_prerequisite', minimumGrade: 'C', concurrencyAllowed: false, institutionId: 'inst_1', createdAt: '' },
  ];

  it('should rank courses by bottleneck severity score', () => {
    const analyzer = new BottleneckAnalyzer(mockCourses, mockPrereqs);
    const bottlenecks = analyzer.analyzeBottlenecks();

    expect(bottlenecks).toHaveLength(5);
    // CS102 has low pass rate (0.65) and blocks CS201, CS301, CS401
    expect(bottlenecks[0].courseCode).toBe('CS102');
    expect(bottlenecks[0].bottleneckScore).toBeGreaterThan(50);
    expect(bottlenecks[0].blockingFactor).toBe(3);
  });

  it('should simulate student cohort progression over terms', () => {
    const simulator = new GraduationSimulator(mockCourses, mockPrereqs);
    const simulation = simulator.simulateCohort(200, 8, 1.0);

    expect(simulation.cohortSize).toBe(200);
    expect(simulation.fourYearGraduationRate).toBeGreaterThan(50);
    expect(simulation.termSummaries).toHaveLength(8);
    expect(simulation.retentionTrajectory).toHaveLength(8);

    // Retention in term 8 should be positive and less than or equal to initial cohort
    const finalRetention = simulation.retentionTrajectory[7];
    expect(finalRetention.retainedCount).toBeLessThanOrEqual(200);
    expect(finalRetention.retentionRate).toBeGreaterThan(0);
  });
});
