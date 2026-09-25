export type RequirementCategoryType =
  | 'major_core'
  | 'major_elective'
  | 'gen_ed'
  | 'open_elective'
  | 'residency'
  | 'gpa_minimum';

export interface AuditCourseRecord {
  courseCode: string;
  title: string;
  credits: number;
  grade: string;
  qualityPoints: number;
  termTaken?: string;
  status: 'completed' | 'in_progress' | 'transferred' | 'waived';
}

export interface RequirementCategoryStatus {
  categoryType: RequirementCategoryType;
  categoryTitle: string;
  requiredCredits: number;
  earnedCredits: number;
  inProgressCredits: number;
  isSatisfied: boolean;
  courses: AuditCourseRecord[];
  missingCourseCodes: string[];
  deficits: string[];
}

export interface DegreeAuditReport {
  studentId: string;
  programCode: string;
  programTitle: string;
  catalogYear: string;
  isGraduationEligible: boolean;
  totalRequiredCredits: number;
  totalEarnedCredits: number;
  totalInProgressCredits: number;
  completionPercentage: number;
  cumulativeGpa: number;
  majorGpa: number;
  isGpaSatisfied: boolean;
  isResidencySatisfied: boolean;
  categories: RequirementCategoryStatus[];
  outstandingRequirements: string[];
  auditTimestamp: string;
  merkleAuditHash: string;
}
