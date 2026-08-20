export interface KmQueryMetricEvent {
  queryId: string;
  topic: string;
  intent: string;
  wasResolvedAutonomously: boolean;
  userSatisfactionRating?: number; // 1 to 5
  responseTimeMs: number;
  tokensConsumed: number;
  timestamp: string;
  departmentId?: string;
  institutionId: string;
}

export interface KnowledgeGapReport {
  topic: string;
  unansweredCount: number;
  sampleQueries: string[];
  suggestedDocumentAction: string;
}

export interface KmAnalyticsSummary {
  totalQueries: number;
  autonomousDeflectionRatePercent: number;
  avgResponseTimeMs: number;
  avgSatisfactionScore: number;
  totalTokensConsumed: number;
  queriesByDepartment: Record<string, number>;
  topKnowledgeGaps: KnowledgeGapReport[];
}
