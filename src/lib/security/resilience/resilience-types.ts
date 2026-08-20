/**
 * Resilience Score Quantification Types
 * Sprint-042 (ARES) — ARES-015
 */

export type ResilienceTier = 'RESILIENT' | 'ROBUST' | 'DEGRADED' | 'CRITICAL';

export interface ResilienceVectorScore {
  vectorName: string;
  weight: number; // Sum of weights = 1.0
  score: number; // 0 - 100
  factors: Record<string, number>;
  status: 'OPTIMAL' | 'ACCEPTABLE' | 'NEEDS_ATTENTION' | 'CRITICAL';
}

export interface SystemResilienceSnapshot {
  snapshotId: string;
  overallScore: number; // 0 - 100
  tier: ResilienceTier;
  vectors: {
    faultToleranceAndChaos: ResilienceVectorScore; // 30%
    recoveryTimeAndMTTR: ResilienceVectorScore; // 25%
    zeroTrustMicroSegmentation: ResilienceVectorScore; // 20%
    predictiveHardeningReadiness: ResilienceVectorScore; // 15%
    auditCryptographicHealth: ResilienceVectorScore; // 10%
  };
  mttrSeconds: number;
  unresolvedGapsCount: number;
  calculatedAt: string;
}

export interface ResilienceTrendReport {
  currentScore: number;
  sevenDayAverage: number;
  thirtyDayAverage: number;
  driftVelocityPercent: number; // +/- % change
  trajectory: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  historySnapshots: { timestamp: string; score: number }[];
}

export interface RemediationRecommendation {
  recommendationId: string;
  title: string;
  description: string;
  targetVector: string;
  estimatedScoreImpact: number; // + points
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  remediationSteps: string[];
}
