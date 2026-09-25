export interface CloudSpotQuote {
  provider: 'aws' | 'gcp' | 'runpod' | 'on_prem';
  region: string;
  gpuModel: string;
  instanceType: string;
  gpuCount: number;
  spotPriceUsdPerHour: number;
  onDemandPriceUsdPerHour: number;
  savingsPercent: number;
  interruptionRiskScore: number; // 0.0 (low) to 1.0 (very high)
  lastUpdated: string;
}

export interface ArbitrageDecision {
  jobId: string;
  recommendedTarget: 'on_prem' | 'aws' | 'gcp' | 'runpod';
  selectedQuote: CloudSpotQuote;
  estimatedCostUsd: number;
  savingsVsOnDemandUsd: number;
  savingsPercent: number;
  carbonIntensityGCO2PerKwh: number;
  rationale: string;
}

export interface PreemptionSignal {
  provider: 'aws' | 'gcp' | 'runpod';
  instanceId: string;
  nodeId: string;
  timeRemainingSeconds: number; // e.g. 120s for AWS/GCP
  receivedAt: string;
}

export interface CheckpointSaveResult {
  checkpointId: string;
  jobId: string;
  stepNumber: number;
  epochNumber: number;
  storageUri: string;
  sha256Hash: string;
  fileSizeBytes: number;
  isEmergencyFlush: boolean;
  saveDurationMs: number;
}

export interface PreemptionRecoveryResult {
  jobId: string;
  preemptedNodeId: string;
  targetNodeId: string;
  restoredFromCheckpointId: string;
  resumedAtStep: number;
  recoveryDurationMs: number;
  status: 'resumed' | 'failed';
}
