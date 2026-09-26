import { TermSchedulePlan } from './advising-types';
import { prerequisiteValidator } from './prereq-validator';

export interface ScheduleOptimizerOptions {
  targetTermsCount?: number; // default 4 terms (2 years)
  maxCreditsPerTerm?: number; // default 16
  minCreditsPerTerm?: number; // default 12
}

export class ScheduleOptimizer {
  /**
   * Generates a balanced, topologically sorted multi-semester schedule plan given missing courses.
   */
  public generateOptimalSchedule(
    missingCourseCodes: string[],
    completedCourseCodes: string[],
    options?: ScheduleOptimizerOptions
  ): TermSchedulePlan[] {
    const maxCredits = options?.maxCreditsPerTerm || 16;
    const targetTerms = options?.targetTermsCount || 4;

    const completed = new Set(completedCourseCodes);
    const unassigned = new Set(missingCourseCodes);
    const schedule: TermSchedulePlan[] = [];

    for (let termIdx = 1; termIdx <= targetTerms; termIdx++) {
      if (unassigned.size === 0) break;

      const termName = termIdx % 2 === 1 ? `Fall 202${Math.floor(6 + termIdx / 2)}` : `Spring 202${Math.floor(6 + termIdx / 2)}`;
      let currentTermCredits = 0;
      const termCourses: TermSchedulePlan['courses'] = [];

      const eligibleThisTerm: string[] = [];
      for (const courseCode of unassigned) {
        const val = prerequisiteValidator.validatePrerequisites(courseCode, Array.from(completed));
        if (val.isSatisfied) {
          eligibleThisTerm.push(courseCode);
        }
      }

      for (const courseCode of eligibleThisTerm) {
        const courseCredits = 4; // Default credit weight
        if (currentTermCredits + courseCredits <= maxCredits) {
          termCourses.push({
            courseCode,
            courseTitle: `Course ${courseCode}`,
            credits: courseCredits,
            prerequisitesMet: true,
          });
          currentTermCredits += courseCredits;
          unassigned.delete(courseCode);
        }
      }

      // Add completed courses from this term into completed set for next term
      for (const c of termCourses) {
        completed.add(c.courseCode);
      }

      schedule.push({
        termName,
        targetCredits: currentTermCredits,
        courses: termCourses,
      });
    }

    return schedule;
  }
}

export const scheduleOptimizer = new ScheduleOptimizer();
