/**
 * Disaster Recovery & Chaos Engineering Types
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

export type FailureType =
  | "DATABASE_PRIMARY_DROP"
  | "REPLICA_LAG_INJECTION"
  | "NETWORK_PARTITION"
  | "EDGE_CACHE_DISCONNECT"
  | "REDIS_MESH_PARTITION";

export type DrillScenarioType =
  | "PRIMARY_OUTAGE"
  | "REGIONAL_PARTITION"
  | "CACHE_DESYNC"
  | "MULTI_TENANT_ISOLATION_DRILL";

export type DrillStatus =
  | "IDLE"
  | "STARTING"
  | "INJECTING_FAULT"
  | "EVALUATING_FAILOVER"
  | "RESTORING"
  | "COMPLETED"
  | "ABORTED"
  | "FAILED";

export interface ActiveFault {
  id: string;
  type: FailureType;
  target: string;
  params: Record<string, unknown>;
  injectedAt: string;
  expiresAt: string;
  active: boolean;
  ttlMs: number;
}

export interface FailureInjector {
  type: FailureType;
  inject(target: string, params?: Record<string, unknown>, ttlMs?: number): Promise<ActiveFault>;
  remove(faultId: string): Promise<boolean>;
  reset(): Promise<void>;
  getActiveFaults(): ActiveFault[];
}

export interface DrillScenarioStep {
  name: string;
  action: "inject_fault" | "assert_failover" | "test_write_read" | "revert_fault" | "verify_parity";
  failureType?: FailureType;
  target?: string;
  params?: Record<string, unknown>;
  expectedMaxDurationMs?: number;
}

export interface DrillExecutionResult {
  drillId: string;
  scenario: DrillScenarioType;
  status: DrillStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  mttrMs?: number;
  rpoLostTransactions: number;
  parityVerified: boolean;
  slaPassed: boolean;
  stepsExecuted: {
    stepName: string;
    durationMs: number;
    success: boolean;
    error?: string;
  }[];
  errorMessage?: string;
}
