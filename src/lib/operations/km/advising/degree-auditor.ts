import { StudentTranscriptEntry, ProgramCurriculum } from './advising-types';
import { DegreeAuditResult } from '../km-types';

export class DegreeAuditor {
  private static gradePoints: Record<string, number> = {
    'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0, 'F': 0.0,
  };

  /**
   * Evaluates student transcript against degree curriculum and computes graduation fulfillment.
   */
  public auditStudentDegree(
    studentId: string,
    transcript: StudentTranscriptEntry[],
    curriculum: ProgramCurriculum
  ): DegreeAuditResult {
    let totalCompletedCredits = 0;
    let totalGradePoints = 0;
    let totalGpaCredits = 0;

    let majorGradePoints = 0;
    let majorGpaCredits = 0;

    const completedCourseMap = new Map<string, StudentTranscriptEntry>();

    for (const entry of transcript) {
      if (entry.grade !== 'F' && entry.grade !== 'W' && entry.grade !== 'IP') {
        totalCompletedCredits += entry.credits;
        completedCourseMap.set(entry.courseCode, entry);
      }

      if (DegreeAuditor.gradePoints[entry.grade] !== undefined) {
        const pts = DegreeAuditor.gradePoints[entry.grade] * entry.credits;
        totalGradePoints += pts;
        totalGpaCredits += entry.credits;

        if (entry.isMajorCourse) {
          majorGradePoints += pts;
          majorGpaCredits += entry.credits;
        }
      }
    }

    const cumulativeGpa = totalGpaCredits > 0 ? Number((totalGradePoints / totalGpaCredits).toFixed(2)) : 0;
    const majorGpa = majorGpaCredits > 0 ? Number((majorGradePoints / majorGpaCredits).toFixed(2)) : cumulativeGpa;

    const requirementsSummary = curriculum.requirementGroups.map((group) => {
      let fulfilledCredits = 0;
      const remainingCoursesNeeded: string[] = [];

      // Check mandatory courses
      for (const reqCode of group.mandatoryCourseCodes) {
        if (completedCourseMap.has(reqCode)) {
          fulfilledCredits += completedCourseMap.get(reqCode)!.credits;
        } else {
          remainingCoursesNeeded.push(reqCode);
        }
      }

      // Check elective courses if needed
      if (fulfilledCredits < group.requiredCredits && group.electiveCourseCodes) {
        for (const elecCode of group.electiveCourseCodes) {
          if (completedCourseMap.has(elecCode) && !group.mandatoryCourseCodes.includes(elecCode)) {
            fulfilledCredits += completedCourseMap.get(elecCode)!.credits;
          }
        }
      }

      const isSatisfied = fulfilledCredits >= group.requiredCredits && remainingCoursesNeeded.length === 0;

      return {
        category: group.title,
        requiredCredits: group.requiredCredits,
        fulfilledCredits,
        isSatisfied,
        remainingCoursesNeeded,
      };
    });

    const allReqsSatisfied = requirementsSummary.every((r) => r.isSatisfied);
    const hasEnoughCredits = totalCompletedCredits >= curriculum.totalCreditsRequired;
    const meetsGpa = cumulativeGpa >= curriculum.minCumulativeGpa && majorGpa >= curriculum.minMajorGpa;

    const completionPercentage = Math.min(100, Number(((totalCompletedCredits / curriculum.totalCreditsRequired) * 100).toFixed(1)));

    return {
      studentId,
      programCode: curriculum.programCode,
      totalCompletedCredits,
      totalRequiredCredits: curriculum.totalCreditsRequired,
      completionPercentage,
      cumulativeGpa,
      majorGpa,
      requirementsSummary,
      isGraduationEligible: allReqsSatisfied && hasEnoughCredits && meetsGpa,
    };
  }
}

export const degreeAuditor = new DegreeAuditor();
