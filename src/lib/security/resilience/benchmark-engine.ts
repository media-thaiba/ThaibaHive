/**
 * Resilience Benchmark Calculation Engine
 * Sprint-042 (ARES) — ARES-015
 */

import { ResilienceVectorScore } from './resilience-types';

export class BenchmarkEngine {
  public static calculateFaultToleranceScore(
    chaosPassRatePercent: number = 95,
    redundancyActiveNodes: number = 3
  ): ResilienceVectorScore {
    const passScore = Math.min(100, Math.max(0, chaosPassRatePercent));
    const redundancyScore = Math.min(100, redundancyActiveNodes * 33.3);
    const composite = passScore * 0.7 + redundancyScore * 0.3;

    return {
      vectorName: 'Fault Tolerance & Chaos Resilience',
      weight: 0.30,
      score: Number(composite.toFixed(1)),
      factors: { chaosPassRate: passScore, redundancy: redundancyScore },
      status: composite >= 85 ? 'OPTIMAL' : composite >= 70 ? 'ACCEPTABLE' : 'NEEDS_ATTENTION',
    };
  }

  public static calculateRecoveryTimeScore(mttrSeconds: number = 45): ResilienceVectorScore {
    // 0s MTTR = 100 score, 300s MTTR = 0 score
    const score = Math.max(0, Math.min(100, 100 - (mttrSeconds / 300) * 100));

    return {
      vectorName: 'Recovery Time Objective (RTO & MTTR)',
      weight: 0.25,
      score: Number(score.toFixed(1)),
      factors: { mttrSeconds, targetSlaSeconds: 60 },
      status: score >= 85 ? 'OPTIMAL' : score >= 70 ? 'ACCEPTABLE' : 'NEEDS_ATTENTION',
    };
  }

  public static calculateZeroTrustCoverageScore(
    mtlsStrictPercent: number = 100,
    microSegmentationCoveragePercent: number = 90
  ): ResilienceVectorScore {
    const composite = mtlsStrictPercent * 0.5 + microSegmentationCoveragePercent * 0.5;

    return {
      vectorName: 'Zero-Trust & Micro-Segmentation Coverage',
      weight: 0.20,
      score: Number(composite.toFixed(1)),
      factors: { mtlsCoverage: mtlsStrictPercent, microSegCoverage: microSegmentationCoveragePercent },
      status: composite >= 85 ? 'OPTIMAL' : composite >= 70 ? 'ACCEPTABLE' : 'NEEDS_ATTENTION',
    };
  }

  public static calculatePredictiveReadinessScore(
    forecastAccuracyPercent: number = 88,
    preemptiveMitigationRate: number = 90
  ): ResilienceVectorScore {
    const composite = forecastAccuracyPercent * 0.5 + preemptiveMitigationRate * 0.5;

    return {
      vectorName: 'Predictive Hardening Readiness',
      weight: 0.15,
      score: Number(composite.toFixed(1)),
      factors: { forecastAccuracy: forecastAccuracyPercent, preemptiveRate: preemptiveMitigationRate },
      status: composite >= 85 ? 'OPTIMAL' : composite >= 70 ? 'ACCEPTABLE' : 'NEEDS_ATTENTION',
    };
  }

  public static calculateAuditCryptographicHealthScore(
    merkleChainIntact: boolean = true,
    zkpProofPassRate: number = 100
  ): ResilienceVectorScore {
    const score = merkleChainIntact ? zkpProofPassRate : 0;

    return {
      vectorName: 'Audit & Cryptographic Proof Health',
      weight: 0.10,
      score: Number(score.toFixed(1)),
      factors: { merkleIntact: merkleChainIntact ? 100 : 0, zkpPassRate: zkpProofPassRate },
      status: score >= 90 ? 'OPTIMAL' : 'CRITICAL',
    };
  }
}
