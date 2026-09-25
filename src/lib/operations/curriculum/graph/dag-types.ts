import { PrerequisiteType } from '../curriculum-types';

export interface CurricularNode {
  courseId: string;
  courseCode: string;
  title: string;
  credits: number;
  typicalTerm: number;
  level: number;
  prerequisites: Array<{
    prerequisiteCourseId: string;
    type: PrerequisiteType;
    minimumGrade: string;
    concurrencyAllowed: boolean;
  }>;
  dependents: string[]; // Courses that require this course
}

export interface CurricularEdge {
  fromCourseId: string; // Prerequisite
  toCourseId: string; // Dependent
  type: PrerequisiteType;
  minimumGrade: string;
  concurrencyAllowed: boolean;
}

export interface TopologicalSortResult {
  sortedCourseIds: string[];
  hasCycle: boolean;
  cyclePath?: string[];
  termTiers: Map<string, number>; // Calculated minimum term for each course
  criticalPath: string[]; // Longest prerequisite chain
  criticalPathLength: number;
  complexityIndex: number;
}

export interface PlanValidationViolation {
  termIndex: number;
  courseId: string;
  courseCode: string;
  prerequisiteCourseId: string;
  prerequisiteCourseCode: string;
  violationType: 'missing_prerequisite' | 'scheduled_after_or_same_term' | 'minimum_grade_unmet' | 'credit_overload' | 'credit_underload';
  message: string;
}

export interface PlanValidationResult {
  isValid: boolean;
  termValidations: Array<{
    termIndex: number;
    termName: string;
    totalCredits: number;
    isOverload: boolean; // > 18 credits
    isUnderload: boolean; // < 12 credits
    courses: string[];
  }>;
  violations: PlanValidationViolation[];
  warnings: string[];
  estimatedGraduationTerms: number;
}

export interface CourseBottleneckMetric {
  courseId: string;
  courseCode: string;
  title: string;
  inDegree: number; // Number of prerequisites
  outDegree: number; // Number of downstream dependents
  blockingFactor: number; // Total transitive downstream courses blocked
  criticalPathInfluence: number;
  historicalPassRate: number;
  bottleneckScore: number; // Composite metric [0 - 100]
}

export interface CohortSimulationTermSummary {
  termIndex: number;
  termName: string;
  enrolledStudentsCount: number;
  onTrackPercentage: number;
  delayedStudentsCount: number;
  bottleneckCourseCongestion: Array<{ courseCode: string; waitlistedOrDelayed: number }>;
}

export interface CohortSimulationResult {
  cohortSize: number;
  simulationTerms: number;
  fourYearGraduationRate: number; // %
  sixYearGraduationRate: number; // %
  averageTermsToDegree: number;
  retentionTrajectory: Array<{ termIndex: number; retainedCount: number; retentionRate: number }>;
  termSummaries: CohortSimulationTermSummary[];
  identifiedBottlenecks: CourseBottleneckMetric[];
  curriculumComplexityIndex: number;
}
