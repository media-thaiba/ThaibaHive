/**
 * Automated Chaos Mesh Core Types
 * Sprint-042 (ARES) — ARES-005
 */

export type ChaosFaultType =
  | 'NETWORK_PARTITION'
  | 'PACKET_CORRUPTION'
  | 'LATENCY_JITTER'
  | 'SERVICE_DEGRADATION'
  | 'CA_COMPROMISE'
  | 'TOKEN_REPLAY'
  | 'DATABASE_SPLIT_BRAIN';

export type ChaosExperimentState =
  | 'IDLE'
  | 'PRE_CHECK'
  | 'INJECTING'
  | 'OBSERVING'
  | 'ROLLING_BACK'
  | 'COMPLETED'
  | 'ABORTED'
  | 'FAILED';

export interface ChaosTargetDefinition {
  targetType: 'SERVICE' | 'SUBNET' | 'DATABASE' | 'GATEWAY' | 'PKI_CA';
  targetIdentifier: string;
  blastRadiusPercentage: number; // 1 - 100%
}

export interface ChaosScenario {
  scenarioId: string;
  name: string;
  description: string;
  faultType: ChaosFaultType;
  target: ChaosTargetDefinition;
  durationSeconds: number;
  parameters: Record<string, unknown>;
  safetyThresholds: {
    maxErrorRatePercent: number; // e.g. 1.0%
    maxP99LatencyMs: number; // e.g. 1000ms
    maxConsecutiveFailures: number; // e.g. 3
  };
}

export interface ChaosExecutionRecord {
  executionId: string;
  scenarioId: string;
  state: ChaosExperimentState;
  startTime: string;
  endTime?: string;
  baselineMetrics: {
    errorRate: number;
    p99LatencyMs: number;
  };
  observedMetrics: {
    errorRate: number;
    p99LatencyMs: number;
    peakDegradationPercent: number;
  };
  recoveryTimeMs: number;
  resilienceScoreDeduction: number;
  abortReason?: string;
  logs: string[];
}

export interface ChaosInjector {
  faultType: ChaosFaultType;
  inject(target: ChaosTargetDefinition, params: Record<string, unknown>): Promise<boolean>;
  revert(target: ChaosTargetDefinition): Promise<boolean>;
  isFaultActive(target: ChaosTargetDefinition): boolean;
}
