export interface OptimizationRecommendation {
  recommendedEpsilonPerRound: number;
  recommendedBatchSize: number;
  recommendedRounds: number;
  expectedConvergenceAccuracy: number;
  projectedLifetimeLoss: number;
  recommendationRationale: string;
}

/**
 * Utility vs. Privacy Trade-off Optimizer
 */
export class UtilityPrivacyOptimizer {
  /**
   * Recommend optimal federated hyperparameters given total budget and dataset size
   */
  public static optimizeHyperparameters(
    totalEpsilonBudget: number,
    targetAccuracy: number,
    totalDatasetSamples: number,
    featureCount: number
  ): OptimizationRecommendation {
    // Heuristic trade-off based on dimension scaling sqrt(d) and budget allocation
    const recommendedRounds = totalEpsilonBudget >= 5.0 ? 20 : 10;
    const epsPerRound = Number((totalEpsilonBudget / (recommendedRounds * 1.2)).toFixed(3));
    const batchSize = Math.max(16, Math.min(256, Math.floor(totalDatasetSamples / (recommendedRounds * 10))));

    const noiseScale = Math.sqrt(featureCount) / (epsPerRound * Math.sqrt(batchSize));
    const expectedAccuracy = Math.max(0.70, Math.min(0.96, targetAccuracy - noiseScale * 0.05));

    return {
      recommendedEpsilonPerRound: epsPerRound,
      recommendedBatchSize: batchSize,
      recommendedRounds,
      expectedConvergenceAccuracy: Number(expectedAccuracy.toFixed(3)),
      projectedLifetimeLoss: Number((totalEpsilonBudget * 0.9).toFixed(2)),
      recommendationRationale: `Allocating ${epsPerRound} epsilon over ${recommendedRounds} rounds with batch size ${batchSize} preserves >=${(expectedAccuracy * 100).toFixed(1)}% accuracy under DP noise constraint.`,
    };
  }
}
