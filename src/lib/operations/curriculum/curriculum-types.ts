export type DegreeType = 'bachelor' | 'master' | 'doctorate' | 'associate' | 'diploma';
export type ProgramStatus = 'active' | 'archived' | 'draft';
export type CourseType = 'major_core' | 'major_elective' | 'gen_ed' | 'open_elective';
export type PrerequisiteType = 'hard_prerequisite' | 'corequisite' | 'advisory';
export type PlanStatus = 'draft' | 'submitted' | 'approved' | 'superseded';
export type PlanCourseStatus = 'planned' | 'enrolled' | 'completed' | 'waived' | 'dropped';
export type ArticulationStatus = 'pending' | 'approved' | 'rejected' | 'faculty_review';
export type AdvisingDomain =
  | 'degree_planner'
  | 'career_alignment'
  | 'transfer_articulation'
  | 'financial_aid_load'
  | 'academic_recovery';
export type AdvisingSessionStatus = 'active' | 'resolved' | 'handed_off_to_human';
export type AdvisingSenderType = 'student' | 'agent' | 'human_advisor' | 'system';
export type RetentionRiskTier = 'critical' | 'high' | 'medium' | 'low';
export type RetentionAlertStatus = 'open' | 'triaged' | 'in_intervention' | 'resolved' | 'dismissed';
export type CurriculumAuditActionType =
  | 'plan_approved'
  | 'prerequisite_waived'
  | 'course_substituted'
  | 'transfer_approved'
  | 'retention_overridden';

export interface CurriculumProgramDto {
  id: string;
  programCode: string;
  title: string;
  departmentId?: string | null;
  degreeType: DegreeType;
  totalCreditsRequired: number;
  minimumGpa: number;
  catalogYear: string;
  status: ProgramStatus;
  curriculumComplexityIndex: number;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumCourseDto {
  id: string;
  courseCode: string;
  title: string;
  departmentId?: string | null;
  credits: number;
  level: number;
  courseType: CourseType;
  minGrade: string;
  typicalTerm: number;
  historicalPassRate: number;
  blockingFactor: number;
  description?: string | null;
  syllabusEmbedding?: string | null;
  status: 'active' | 'archived';
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumPrerequisiteDto {
  id: string;
  courseId: string;
  prerequisiteCourseId: string;
  type: PrerequisiteType;
  minimumGrade: string;
  concurrencyAllowed: boolean;
  institutionId: string;
  createdAt: string;
}

export interface CurriculumDegreePlanDto {
  id: string;
  planId: string;
  studentId: string;
  programId: string;
  title: string;
  targetGraduationTerm: string;
  totalTerms: number;
  status: PlanStatus;
  approvedByAdvisorId?: string | null;
  approvedAt?: string | null;
  merkleAuditHash: string;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
  courses?: CurriculumPlanCourseDto[];
}

export interface CurriculumPlanCourseDto {
  id: string;
  planId: string;
  courseId: string;
  plannedTermIndex: number;
  termName: string;
  credits: number;
  status: PlanCourseStatus;
  gradeReceived?: string | null;
  isPrerequisiteSatisfied: boolean;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
  courseDetails?: CurriculumCourseDto;
}

export interface CurriculumTransferArticulationDto {
  id: string;
  articulationId: string;
  studentId: string;
  sourceInstitution: string;
  sourceCourseCode: string;
  sourceCourseTitle: string;
  sourceCredits: number;
  sourceGrade: string;
  targetCourseId?: string | null;
  semanticMatchScore: number;
  status: ArticulationStatus;
  reviewedByStaffId?: string | null;
  reviewedAt?: string | null;
  waiverReason?: string | null;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumAdvisingSessionDto {
  id: string;
  sessionId: string;
  studentId: string;
  activeDomain: AdvisingDomain;
  status: AdvisingSessionStatus;
  assignedCounselorId?: string | null;
  sessionSummary?: string | null;
  proposedChangesJson?: string | null;
  confidenceScore: number;
  startedAt: string;
  endedAt?: string | null;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumAdvisingMessageDto {
  id: string;
  sessionId: string;
  senderType: AdvisingSenderType;
  agentDomain?: AdvisingDomain | null;
  messageContent: string;
  citationsJson?: string | null;
  roadmapActionJson?: string | null;
  tokenCount: number;
  sentAt: string;
  institutionId: string;
  createdAt: string;
}

export interface CurriculumRetentionAlertDto {
  id: string;
  alertId: string;
  studentId: string;
  riskTier: RetentionRiskTier;
  riskScore: number;
  contributingFactorsJson: string;
  recommendedInterventionJson?: string | null;
  status: RetentionAlertStatus;
  assignedCounselorId?: string | null;
  engageOsDispatched: boolean;
  lastContactedAt?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumAuditLogDto {
  id: string;
  auditId: string;
  actionType: CurriculumAuditActionType;
  targetStudentId?: string | null;
  planId?: string | null;
  performedByUserId: string;
  actorRole: string;
  previousState?: string | null;
  newState?: string | null;
  justification?: string | null;
  merkleProof: string;
  merkleAuditHash: string;
  auditTimestamp: string;
  institutionId: string;
  createdAt: string;
}
