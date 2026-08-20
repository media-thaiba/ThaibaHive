/**
 * System Resilience Score Calculator
 * Sprint-042 (ARES) — ARES-015
 */

import { randomUUID } from 'crypto';
import { SystemResilienceSnapshot, ResilienceTier } from './resilience-types';
import { BenchmarkEngine } from './benchmark-engine';

export class ResilienceCalculator {
  private static instance: ResilienceCalculator | null = null;
  private snapshotHistory: SystemResilienceSnapshot[] = [];

  private constructor() {}

  public static getInstance(): ResilienceCalculator {
    if (!ResilienceCalculator.instance) {
      ResilienceCalculator.instance = new ResilienceCalculator();
    }
    return ResilienceCalculator.instance;
  }

  public static resetInstance(): void {
    ResilienceCalculator.instance = null;
  }

  /**
   * Computes the composite resilience snapshot across all 5 benchmark vectors
   */
  public calculateSystemResilience(inputs?: {
    chaosPassRate?: number;
    redundancyNodes?: number;
    mttrSeconds?: number;
    mtlsPercent?: number;
    microSegPercent?: number;
    forecastAccuracy?: number;
    preemptiveRate?: number;
    merkleIntact?: boolean;
    zkpPassRate?: number;
  }): SystemResilienceSnapshot {
    const v1 = BenchmarkEngine.calculateFaultToleranceScore(inputs?.chaosPassRate, inputs?.redundancyNodes);
    const v2 = BenchmarkEngine.calculateRecoveryTimeScore(inputs?.mttrSeconds);
    const v3 = BenchmarkEngine.calculateZeroTrustCoverageScore(inputs?.mtlsPercent, inputs?.microSegPercent);
    const v4 = BenchmarkEngine.calculatePredictiveReadinessScore(inputs?.forecastAccuracy, inputs?.preemptiveRate);
    const v5 = BenchmarkEngine.calculateAuditCryptographicHealthScore(inputs?.merkleIntact, inputs?.zkpPassRate);

    const overallScore = Number(
      (v1.score * v1.weight +
        v2.score * v2.weight +
        v3.score * v3.weight +
        v4.score * v4.weight +
        v5.score * v5.weight).toFixed(1)
    );

    let tier: ResilienceTier = 'CRITICAL';
    if (overallScore >= 85) tier = 'RESILIENT';
    else if (overallScore >= 70) tier = 'ROBUST';
    else if (overallScore >= 50) tier = 'DEGRADED';

    const vectorsList = [v1, v2, v3, v4, v5];
    const unresolvedGapsCount = vectorsList.filter((v) => v.status === 'NEEDS_ATTENTION' || v.status === 'CRITICAL').length;

    const snapshot: SystemResilienceSnapshot = {
      snapshotId: `res-snap-${randomUUID().slice(0, 8)}`,
      overallScore,
      tier,
      vectors: {
        faultToleranceAndChaos: v1,
        recoveryTimeAndMTTR: v2,
        zeroTrustMicroSegmentation: v3,
        predictiveHardeningReadiness: v4,
        auditCryptographicHealth: v5,
      },
      mttrSeconds: inputs?.mttrSeconds ?? 45,
      unresolvedGapsCount,
      calculatedAt: new Date().toISOString(),
    };

    this.snapshotHistory.push(snapshot);
    return snapshot;
  }

  public getSnapshotHistory(): SystemResilienceSnapshot[] {
    return [...this.snapshotHistory];
  }
}
