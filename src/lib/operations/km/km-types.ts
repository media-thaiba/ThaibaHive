export type KmEntityType =
  | 'course'
  | 'major'
  | 'department'
  | 'instructor'
  | 'policy'
  | 'facility'
  | 'requirement'
  | 'career_path';

export type KmRelationType =
  | 'prerequisite_of'
  | 'co_requisite'
  | 'offered_by'
  | 'fulfills_requirement'
  | 'governed_by'
  | 'taught_by'
  | 'leads_to_career';

export interface KmNode {
  id: string;
  name: string;
  type: KmEntityType;
  code?: string;
  description?: string;
  metadata?: Record<string, any>;
  institutionId?: string;
}

export interface KmEdge {
  id: string;
  source: string; // source node id
  target: string; // target node id
  relation: KmRelationType;
  properties?: Record<string, any>;
  weight?: number;
  institutionId?: string;
}

export interface GraphTraversalPath {
  nodes: KmNode[];
  edges: KmEdge[];
  totalWeight: number;
}

export interface PrerequisiteValidationResult {
  isSatisfied: boolean;
  missingPrerequisites: string[];
  waivedPrerequisites: string[];
  circularDependencyDetected: boolean;
}

export interface DegreeRequirement {
  id: string;
  category: 'core' | 'major_elective' | 'general_ed' | 'capstone';
  title: string;
  requiredCredits: number;
  eligibleCourses: string[]; // Course codes
}

export interface DegreeProgramRules {
  programId: string;
  programName: string;
  code: string;
  totalCredits: number;
  minGpa: number;
  requirements: DegreeRequirement[];
}

export interface StudentCourseRecord {
  courseCode: string;
  courseTitle: string;
  credits: number;
  grade: string; // 'A' | 'B' | 'C' | 'D' | 'F' | 'IP' (In Progress) | 'W'
  term: string;
  isCompleted: boolean;
}

export interface DegreeAuditResult {
  studentId: string;
  programCode: string;
  totalCompletedCredits: number;
  totalRequiredCredits: number;
  completionPercentage: number;
  cumulativeGpa: number;
  majorGpa: number;
  requirementsSummary: {
    category: string;
    requiredCredits: number;
    fulfilledCredits: number;
    isSatisfied: boolean;
    remainingCoursesNeeded: string[];
  }[];
  isGraduationEligible: boolean;
}

export interface DocumentChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  category: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata?: Record<string, any>;
}

export interface SearchResultItem {
  chunk: DocumentChunk;
  denseScore?: number;
  sparseScore?: number;
  fusedScore: number;
  rerankScore?: number;
  citations: {
    title: string;
    section?: string;
    pageNumber?: number;
  };
}

export interface CopilotMessagePayload {
  sessionId: string;
  studentId: string;
  prompt: string;
  targetLanguage?: string;
  institutionId?: string;
}

export interface CopilotToolExecution {
  toolName: string;
  input: Record<string, any>;
  output: Record<string, any>;
  executionTimeMs: number;
}

export interface CopilotResponsePayload {
  answerText: string;
  translatedAnswerText?: string;
  language: string;
  confidenceScore: number;
  citations: Array<{
    documentTitle: string;
    sectionTitle?: string;
    contentSnippet: string;
    relevanceScore: number;
  }>;
  toolsExecuted: CopilotToolExecution[];
  reasoningSteps: string[];
  suggestedFollowUps: string[];
}
