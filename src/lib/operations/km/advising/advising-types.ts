export interface StudentTranscriptEntry {
  courseCode: string;
  courseTitle: string;
  credits: number;
  grade: 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F' | 'IP' | 'W';
  term: string; // e.g. "Fall 2024", "Spring 2025"
  isMajorCourse?: boolean;
}

export interface DegreeRequirementGroup {
  categoryId: string;
  title: string; // e.g. "Core Computer Science", "Mathematics Foundation", "Major Electives"
  requiredCredits: number;
  mandatoryCourseCodes: string[];
  electiveCourseCodes?: string[];
  minGrade?: string;
}

export interface ProgramCurriculum {
  programId: string;
  programCode: string;
  name: string;
  departmentId: string;
  totalCreditsRequired: number;
  minCumulativeGpa: number;
  minMajorGpa: number;
  requirementGroups: DegreeRequirementGroup[];
}

export interface TermSchedulePlan {
  termName: string; // e.g. "Fall 2026", "Spring 2027"
  targetCredits: number;
  courses: Array<{
    courseCode: string;
    courseTitle: string;
    credits: number;
    prerequisitesMet: boolean;
  }>;
}

export interface CareerPathProfile {
  careerId: string;
  title: string;
  industry: string;
  recommendedElectives: string[];
  keySkillAreas: string[];
  marketDemandScore: number;
}
