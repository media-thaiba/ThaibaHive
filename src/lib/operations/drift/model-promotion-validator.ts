export interface ValidationMetrics {
  accuracy: number;
  f1Score: number;
  loss: number;
  latencyMs: number;
  demographicDisparityScore: number; // Fairness / bias metric <= 0.10
}

export interface ModelPromotionVerdict {
  candidateModelId: string;
  isApproved: boolean;
  verdict: 'APPROVED_PROD' | 'REJECTED_REGRESSION' | 'REJECTED_BIAS' | 'CANARY_ONLY';
  reasons: string[];
  candidateMetrics: ValidationMetrics;
  baselineMetrics: ValidationMetrics;
}

/**
 * Model Promotion Validator ensuring regression-free, fair model deployment
 */
export class ModelPromotionValidator {
  public static validate(
    candidateModelId: string,
    candidateMetrics: ValidationMetrics,
    baselineMetrics: ValidationMetrics,
    minAccuracyDelta: number = -0.02 // Max allowed accuracy drop (-2%)
  ): ModelPromotionVerdict {
    const reasons: string[] = [];
    let isApproved = true;
    let verdict: 'APPROVED_PROD' | 'REJECTED_REGRESSION' | 'REJECTED_BIAS' | 'CANARY_ONLY' = 'APPROVED_PROD';

    // 1. Accuracy & F1 Regression check
    const accDelta = candidateMetrics.accuracy - baselineMetrics.accuracy;
    if (accDelta < minAccuracyDelta) {
      isApproved = false;
      verdict = 'REJECTED_REGRESSION';
      reasons.push(`Accuracy regressed by ${(accDelta * 100).toFixed(2)}% (below allowed threshold)`);
    }

    // 2. Demographic Fairness check (disparity < 0.10)
    if (candidateMetrics.demographicDisparityScore > 0.10) {
      isApproved = false;
      verdict = 'REJECTED_BIAS';
      reasons.push(`Demographic parity disparity score (${candidateMetrics.demographicDisparityScore}) exceeds 0.10`);
    }

    // 3. Canary condition
    if (isApproved && accDelta >= 0 && accDelta < 0.01) {
      verdict = 'CANARY_ONLY';
      reasons.push('Model approved for 10% Canary traffic deployment');
    } else if (isApproved) {
      reasons.push('Model outperforms baseline with zero detected fairness bias');
    }

    return {
      candidateModelId,
      isApproved,
      verdict,
      reasons,
      candidateMetrics,
      baselineMetrics,
    };
  }
}
