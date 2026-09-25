import { AdvisingDomain } from '../curriculum-types';

export interface AdvisingIntent {
  domain: AdvisingDomain;
  confidence: number;
  extractedEntities: {
    courseCodes?: string[];
    targetCareer?: string;
    targetGraduationTerm?: string;
    creditCount?: number;
    gpa?: number;
    sourceInstitution?: string;
  };
  rationale: string;
}

export interface AdvisingCitation {
  documentTitle: string;
  section: string;
  excerpt: string;
  catalogYear?: string;
}

export interface ProposedRoadmapAction {
  actionType: 'add_course' | 'remove_course' | 'reorder_term' | 'substitute_course';
  courseId?: string;
  courseCode?: string;
  targetTerm?: number;
  replacementCourseCode?: string;
  reason: string;
}

export interface AdvisorAgentResponse {
  agentDomain: AdvisingDomain;
  agentName: string;
  replyText: string;
  citations: AdvisingCitation[];
  proposedRoadmapAction?: ProposedRoadmapAction | null;
  confidence: number;
  followUpPrompts: string[];
}

export interface StudentAcademicProfile {
  studentId: string;
  name?: string;
  majorProgramCode: string;
  declaredCatalogYear: string;
  cumulativeGpa: number;
  majorGpa: number;
  totalCompletedCredits: number;
  termStanding: number; // e.g. 1..8
  academicStanding: 'good_standing' | 'academic_probation' | 'dean_list';
  passedCourses: Array<{ courseCode: string; grade: string; credits: number }>;
  inProgressCourses: string[];
  institutionId: string;
}

export interface BaseAdvisorAgent {
  domain: AdvisingDomain;
  name: string;
  description: string;
  evaluate(
    prompt: string,
    profile: StudentAcademicProfile,
    intent: AdvisingIntent
  ): Promise<AdvisorAgentResponse>;
}
