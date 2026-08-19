/**
 * Device Trust Dynamic Calibration Engine
 * Sprint-041 (ZASM)
 */

import { DeviceTrustScore, TrustWeights } from './trust-types';
import { DEFAULT_TRUST_WEIGHTS } from './trust-weights';

export interface CalibrationReport {
  evaluatedCount: number;
  averageScore: number;
  highTrustPercentage: number;
  mediumTrustPercentage: number;
  lowTrustPercentage: number;
  untrustedPercentage: number;
  recommendedWeightAdjustment?: Partial<TrustWeights>;
}

export class TrustCalibrationEngine {
  /**
   * Analyzes historical scores and generates calibration recommendations
   */
  public static calibrate(scores: DeviceTrustScore[]): CalibrationReport {
    if (scores.length === 0) {
      return {
        evaluatedCount: 0,
        averageScore: 100,
        highTrustPercentage: 100,
        mediumTrustPercentage: 0,
        lowTrustPercentage: 0,
        untrustedPercentage: 0,
      };
    }

    const total = scores.length;
    const sum = scores.reduce((acc, s) => acc + s.score, 0);
    const averageScore = Math.round(sum / total);

    const high = scores.filter((s) => s.tier === 'HIGH_TRUST').length;
    const medium = scores.filter((s) => s.tier === 'MEDIUM_TRUST').length;
    const low = scores.filter((s) => s.tier === 'LOW_TRUST').length;
    const untrusted = scores.filter((s) => s.tier === 'UNTRUSTED').length;

    let recommendedAdjustment: Partial<TrustWeights> | undefined;

    // If more than 30% of devices are falsely dropping to untrusted, suggest conservative calibration
    if (untrusted / total > 0.3) {
      recommendedAdjustment = {
        osAndPatchWeight: 20,
        endpointComplianceWeight: 20,
        dpopBindingWeight: 20,
        authStrengthWeight: 20,
        geoRiskWeight: 10,
        behavioralStabilityWeight: 10,
      };
    }

    return {
      evaluatedCount: total,
      averageScore,
      highTrustPercentage: Math.round((high / total) * 100),
      mediumTrustPercentage: Math.round((medium / total) * 100),
      lowTrustPercentage: Math.round((low / total) * 100),
      untrustedPercentage: Math.round((untrusted / total) * 100),
      recommendedWeightAdjustment: recommendedAdjustment,
    };
  }
}
