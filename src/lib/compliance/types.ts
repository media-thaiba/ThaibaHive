export type SnapshotType = "SCHEDULED" | "MANUAL" | "PRE_INCIDENT" | "AUDIT";
export type RetentionTier = "HOT" | "WARM" | "COLD";
export type ViolationSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ViolationStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "FALSE_POSITIVE";

export interface ForensicSnapshotManifest {
  id: string;
  tenantId: string;
  snapshotType: SnapshotType;
  timestamp: string;
  version: string;
  entityCounts: Record<string, number>;
  state: {
    usersAndRoles: Array<{ id: string; email: string; role: string; isActive: boolean }>;
    institutionConfig: any[];
    financeLedgerSummary: { totalBalance: number; accountCount: number; transactionCount: number };
    auditRoots: Array<{ id: string; rootHash: string; leafCount: number; createdAt: string }>;
  };
  checksumSha256: string;
  signature?: string;
  signerPublicKey?: string;
}

export interface SnapshotDiffResult {
  baseSnapshotId: string;
  targetSnapshotId: string;
  addedEntities: Record<string, any[]>;
  modifiedEntities: Record<string, Array<{ id: string; changes: Record<string, { before: any; after: any }> }>>;
  deletedEntities: Record<string, any[]>;
  summary: string;
  timestamp: string;
}

export interface ComplianceEvent {
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  payload?: any;
  timestamp: string;
}

export interface ComplianceViolationReport {
  ruleId: string;
  ruleName: string;
  severity: ViolationSeverity;
  score: number; // 0-100 anomaly contribution
  details: Record<string, any>;
}

export interface ComplianceViolationRecord {
  id: string;
  tenantId: string;
  ruleId: string;
  severity: ViolationSeverity;
  actorId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  details: any;
  status: ViolationStatus;
  resolutionNotes?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TelemetrySummary {
  status: "HEALTHY" | "DEGRADED" | "CRITICAL";
  overallScore: number; // 0 - 100 compliance score
  activeViolationsCount: number;
  violationsBySeverity: Record<ViolationSeverity, number>;
  activeRulesCount: number;
  lastEvaluatedAt: string;
  recentViolations: ComplianceViolationRecord[];
}
