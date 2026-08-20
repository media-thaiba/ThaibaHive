import { campusGraph } from '../graph/knowledge-graph-engine';
import { PrerequisiteValidationResult } from '../km-types';

export class PrerequisiteValidator {
  /**
   * Validates if a student has completed all required prerequisite courses for target registration.
   */
  public validatePrerequisites(
    targetCourseCode: string,
    completedCourseCodes: string[],
    waivedCourseCodes: string[] = []
  ): PrerequisiteValidationResult {
    const completedSet = new Set(completedCourseCodes);
    const waivedSet = new Set(waivedCourseCodes);

    const inEdges = campusGraph.getInboundEdges(targetCourseCode).filter((e) => e.relation === 'prerequisite_of');
    const missing: string[] = [];
    const waived: string[] = [];

    for (const edge of inEdges) {
      const reqCourse = edge.source;
      if (completedSet.has(reqCourse)) {
        continue;
      } else if (waivedSet.has(reqCourse)) {
        waived.push(reqCourse);
      } else {
        missing.push(reqCourse);
      }
    }

    const cycleCheck = campusGraph.detectCycles();

    return {
      isSatisfied: missing.length === 0 && !cycleCheck.hasCycles,
      missingPrerequisites: missing,
      waivedPrerequisites: waived,
      circularDependencyDetected: cycleCheck.hasCycles,
    };
  }
}

export const prerequisiteValidator = new PrerequisiteValidator();
