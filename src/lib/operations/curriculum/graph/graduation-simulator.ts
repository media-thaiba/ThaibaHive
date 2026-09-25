import { CurriculumCourseDto, CurriculumPrerequisiteDto } from '../curriculum-types';
import { BottleneckAnalyzer } from './bottleneck-analyzer';
import { CurricularDagSolver } from './curricular-dag-solver';
import { CohortSimulationResult, CohortSimulationTermSummary } from './dag-types';

export class GraduationSimulator {
  private solver: CurricularDagSolver;
  private analyzer: BottleneckAnalyzer;
  private courses: CurriculumCourseDto[];
  private prerequisites: CurriculumPrerequisiteDto[];

  constructor(
    courses: CurriculumCourseDto[],
    prerequisites: CurriculumPrerequisiteDto[]
  ) {
    this.courses = courses;
    this.prerequisites = prerequisites;
    this.solver = new CurricularDagSolver(courses, prerequisites);
    this.analyzer = new BottleneckAnalyzer(courses, prerequisites);
  }

  /**
   * Simulates a cohort of incoming students progressing through the curriculum over 8-12 terms
   */
  public simulateCohort(
    cohortSize: number = 200,
    totalTerms: number = 10,
    passRateModifier: number = 1.0
  ): CohortSimulationResult {
    const identifiedBottlenecks = this.analyzer.analyzeBottlenecks();
    const cci = this.solver.calculateCurricularComplexityIndex();
    const { criticalPathLength } = this.solver.calculateCriticalPath();

    // Baseline graduation assumptions
    // More complex curricular graph & lower pass rates reduce on-time graduation
    const baselineFourYear = Math.max(
      0.3,
      Math.min(0.95, 0.85 - (cci / 100.0) * 0.25 + (passRateModifier - 1.0) * 0.3)
    );
    const fourYearGraduationRate = Math.round(baselineFourYear * 1000) / 10;
    const sixYearGraduationRate = Math.min(98.5, Math.round((fourYearGraduationRate + 15.0) * 10) / 10);
    const averageTermsToDegree = Math.round((8.0 + (100 - fourYearGraduationRate) * 0.03) * 10) / 10;

    const termSummaries: CohortSimulationTermSummary[] = [];
    const retentionTrajectory: CohortSimulationResult['retentionTrajectory'] = [];

    let currentCohort = cohortSize;

    for (let term = 1; term <= totalTerms; term++) {
      // Natural attrition (higher in first 3 terms)
      const termAttritionRate = term <= 2 ? 0.04 : term <= 4 ? 0.02 : 0.01;
      currentCohort = Math.round(currentCohort * (1.0 - termAttritionRate));

      const onTrackFraction = Math.max(0.4, 1.0 - (term - 1) * 0.06 * (1.0 / passRateModifier));
      const onTrackPercentage = Math.round(onTrackFraction * 1000) / 10;
      const delayedStudentsCount = Math.round(currentCohort * (1.0 - onTrackFraction));

      // Calculate bottleneck congestion for this term
      const relevantBottlenecks = identifiedBottlenecks.filter((b) => {
        const course = this.courses.find((c) => c.id === b.courseId || c.courseCode === b.courseCode);
        return (course?.typicalTerm || 1) === term;
      });

      const bottleneckCourseCongestion = relevantBottlenecks.map((b) => ({
        courseCode: b.courseCode,
        waitlistedOrDelayed: Math.round(delayedStudentsCount * (1.0 - b.historicalPassRate * passRateModifier)),
      }));

      termSummaries.push({
        termIndex: term,
        termName: `Term ${term}`,
        enrolledStudentsCount: currentCohort,
        onTrackPercentage,
        delayedStudentsCount,
        bottleneckCourseCongestion,
      });

      retentionTrajectory.push({
        termIndex: term,
        retainedCount: currentCohort,
        retentionRate: Math.round((currentCohort / cohortSize) * 1000) / 10,
      });
    }

    return {
      cohortSize,
      simulationTerms: totalTerms,
      fourYearGraduationRate,
      sixYearGraduationRate,
      averageTermsToDegree,
      retentionTrajectory,
      termSummaries,
      identifiedBottlenecks,
      curriculumComplexityIndex: cci,
    };
  }
}
