export interface ParsedExternalCourse {
  sourceCourseCode: string;
  sourceTitle: string;
  sourceCredits: number;
  sourceGrade: string;
  termTaken?: string;
}

export interface TranscriptParseResult {
  sourceInstitution: string;
  studentName?: string;
  courses: ParsedExternalCourse[];
  confidenceScore: number;
  rawTextLength: number;
}

export type ArticulationRecommendationType =
  | 'exact_equivalent'
  | 'department_review'
  | 'general_elective'
  | 'rejected';

export interface SemanticMatchRecommendation {
  sourceCourse: ParsedExternalCourse;
  targetCourseId?: string;
  targetCourseCode?: string;
  targetCourseTitle?: string;
  semanticSimilarityScore: number;
  recommendationType: ArticulationRecommendationType;
  rationale: string;
}
