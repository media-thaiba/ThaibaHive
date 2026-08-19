export interface PostgresClusterNode {
  nodeId: string;
  role: "PRIMARY" | "STANDBY" | "READ_REPLICA";
  endpoint: string;
  isHealthy: boolean;
  replicationLagBytes: number;
  replicationLagMs: number;
  lastCheckedAt: number;
}

export interface ClusterHealthReport {
  primaryNodeId: string;
  totalNodes: number;
  healthyNodesCount: number;
  isQuorumHealthy: boolean;
  maxReplicationLagMs: number;
  nodes: PostgresClusterNode[];
  timestamp: number;
}

export interface MigrationJob {
  id: string;
  tenantId: string;
  migrationName: string;
  status: "PENDING" | "DUAL_WRITING" | "VALIDATED" | "COMPLETED" | "ROLLED_BACK";
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface IndexRecommendation {
  id: string;
  tableName: string;
  recommendedIndexName: string;
  indexDdl: string;
  seqScans: number;
  estTimeSavingsMs: number;
  riskLevel: RiskLevel;
  status: "RECOMMENDED" | "APPLIED" | "ROLLED_BACK" | "REJECTED";
  createdAt: string;
}

export interface IndexExecutionResult {
  recommendationId: string;
  action: "CREATE_CONCURRENTLY" | "DROP_CONCURRENTLY";
  indexName: string;
  executionDurationMs: number;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
}
