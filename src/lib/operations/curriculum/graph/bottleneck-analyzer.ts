import { CurriculumCourseDto, CurriculumPrerequisiteDto } from '../curriculum-types';
import { CurricularDagSolver } from './curricular-dag-solver';
import { CourseBottleneckMetric } from './dag-types';

export class BottleneckAnalyzer {
  private solver: CurricularDagSolver;
  private coursesMap: Map<string, CurriculumCourseDto> = new Map();

  constructor(
    courses: CurriculumCourseDto[],
    prerequisites: CurriculumPrerequisiteDto[]
  ) {
    this.solver = new CurricularDagSolver(courses, prerequisites);
    for (const c of courses) {
      this.coursesMap.set(c.id, c);
      this.coursesMap.set(c.courseCode, c);
    }
  }

  /**
   * Analyzes all courses in the curriculum to compute bottleneck metrics
   */
  public analyzeBottlenecks(): CourseBottleneckMetric[] {
    const nodes = this.solver.getAllNodes();
    const { criticalPath } = this.solver.calculateCriticalPath();
    const criticalSet = new Set(criticalPath);

    const metrics: CourseBottleneckMetric[] = [];

    for (const node of nodes) {
      const course = this.coursesMap.get(node.courseId);
      const inDegree = node.prerequisites.length;
      const outDegree = node.dependents.length;
      const blockingFactor = this.solver.calculateTransitiveDownstreamCount(node.courseId);
      const isCritical = criticalSet.has(node.courseCode) || criticalSet.has(node.courseId);
      const criticalPathInfluence = isCritical ? 1.0 : 0.0;
      const historicalPassRate = course?.historicalPassRate ?? 0.85;

      // Bottleneck Score formula [0 - 100]:
      // 40% Blocking Factor weight + 30% Pass Rate Failure risk + 20% Critical Path influence + 10% In/Out degree density
      const failureRate = 1.0 - historicalPassRate;
      const normalizedBlocking = Math.min(blockingFactor / 5.0, 1.0);
      const degreeDensity = Math.min((inDegree + outDegree) / 6.0, 1.0);

      const rawScore =
        normalizedBlocking * 40.0 +
        failureRate * 2.0 * 30.0 +
        criticalPathInfluence * 20.0 +
        degreeDensity * 10.0;

      const bottleneckScore = Math.min(Math.round(rawScore * 10) / 10, 100);

      metrics.push({
        courseId: node.courseId,
        courseCode: node.courseCode,
        title: node.title,
        inDegree,
        outDegree,
        blockingFactor,
        criticalPathInfluence,
        historicalPassRate,
        bottleneckScore,
      });
    }

    // Sort descending by bottleneck score
    return metrics.sort((a, b) => b.bottleneckScore - a.bottleneckScore);
  }

  /**
   * Retrieves top bottleneck courses above a specific severity threshold
   */
  public getTopBottlenecks(limit: number = 5): CourseBottleneckMetric[] {
    return this.analyzeBottlenecks().slice(0, limit);
  }
}
