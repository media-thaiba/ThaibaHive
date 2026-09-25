import {
  CurriculumDegreePlanDto,
  CurriculumPlanCourseDto,
  CurriculumCourseDto,
  CurriculumPrerequisiteDto,
} from '../curriculum-types';
import { PlanValidationResult, PlanValidationViolation } from './dag-types';
import { CurricularDagSolver } from './curricular-dag-solver';

export class PrerequisiteValidator {
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
   * Validates a student's degree plan across all planned terms
   */
  public validatePlan(
    plan: CurriculumDegreePlanDto,
    planCourses: CurriculumPlanCourseDto[]
  ): PlanValidationResult {
    const violations: PlanValidationViolation[] = [];
    const warnings: string[] = [];

    // Group courses by term index
    const termMap = new Map<number, CurriculumPlanCourseDto[]>();
    for (const pc of planCourses) {
      const existing = termMap.get(pc.plannedTermIndex) || [];
      existing.push(pc);
      termMap.set(pc.plannedTermIndex, existing);
    }

    const termIndices = Array.from(termMap.keys()).sort((a, b) => a - b);
    const completedOrPriorCourses = new Map<string, number>(); // courseId -> completedTermIndex

    const termValidations: PlanValidationResult['termValidations'] = [];

    for (const termIdx of termIndices) {
      const termCourses = termMap.get(termIdx) || [];
      const termName = termCourses[0]?.termName || `Term ${termIdx}`;
      let totalCredits = 0;
      const courseCodesInTerm: string[] = [];

      for (const pc of termCourses) {
        const courseDetail = this.coursesMap.get(pc.courseId);
        const courseCode = courseDetail?.courseCode || pc.courseId;
        const credits = courseDetail?.credits || pc.credits || 3;
        totalCredits += credits;
        courseCodesInTerm.push(courseCode);

        // Check prerequisites for this course
        const node = this.solver.getNode(pc.courseId);
        if (node) {
          for (const req of node.prerequisites) {
            const prereqDetail = this.coursesMap.get(req.prerequisiteCourseId);
            const prereqCode = prereqDetail?.courseCode || req.prerequisiteCourseId;
            const prereqTerm = completedOrPriorCourses.get(req.prerequisiteCourseId);

            if (prereqTerm === undefined) {
              // Missing prerequisite entirely or scheduled in future
              violations.push({
                termIndex: termIdx,
                courseId: pc.courseId,
                courseCode,
                prerequisiteCourseId: req.prerequisiteCourseId,
                prerequisiteCourseCode: prereqCode,
                violationType: 'missing_prerequisite',
                message: `Prerequisite "${prereqCode}" must be completed before taking "${courseCode}" in Term ${termIdx}.`,
              });
            } else if (prereqTerm >= termIdx && !req.concurrencyAllowed) {
              violations.push({
                termIndex: termIdx,
                courseId: pc.courseId,
                courseCode,
                prerequisiteCourseId: req.prerequisiteCourseId,
                prerequisiteCourseCode: prereqCode,
                violationType: 'scheduled_after_or_same_term',
                message: `Prerequisite "${prereqCode}" is scheduled in Term ${prereqTerm} (same or after Term ${termIdx}) and does not allow concurrent enrollment.`,
              });
            }
          }
        }
      }

      // Record current term courses as completed for subsequent terms
      for (const pc of termCourses) {
        completedOrPriorCourses.set(pc.courseId, termIdx);
      }

      const isOverload = totalCredits > 18;
      const isUnderload = totalCredits < 12;

      if (isOverload) {
        warnings.push(`Term ${termIdx} (${termName}) has ${totalCredits} credits, exceeding full-time maximum of 18 credits.`);
      }
      if (isUnderload) {
        warnings.push(`Term ${termIdx} (${termName}) has ${totalCredits} credits, below full-time minimum of 12 credits.`);
      }

      termValidations.push({
        termIndex: termIdx,
        termName,
        totalCredits,
        isOverload,
        isUnderload,
        courses: courseCodesInTerm,
      });
    }

    const estimatedGraduationTerms = termIndices.length > 0 ? Math.max(...termIndices) : 8;

    return {
      isValid: violations.length === 0,
      termValidations,
      violations,
      warnings,
      estimatedGraduationTerms,
    };
  }
}
