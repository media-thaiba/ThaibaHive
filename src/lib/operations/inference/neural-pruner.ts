export interface PruningResult {
  prunedWeights: number[];
  pruningThreshold: number;
  sparsityRatio: number;
  prunedWeightsCount: number;
  totalWeightsCount: number;
}

/**
 * Magnitude-Based Unstructured Neural Pruning Pipeline
 */
export class NeuralPruner {
  /**
   * Prune lowest magnitude weights below quantile threshold (e.g. 25% lowest weights set to 0)
   */
  public static pruneByMagnitude(weights: number[], pruneFraction: number = 0.25): PruningResult {
    const total = weights.length;
    const sortedMagnitudes = weights.map(Math.abs).sort((a, b) => a - b);
    const thresholdIdx = Math.min(total - 1, Math.floor(total * pruneFraction));
    const pruningThreshold = sortedMagnitudes[thresholdIdx];

    let prunedCount = 0;
    const pruned = weights.map((w) => {
      if (Math.abs(w) <= pruningThreshold) {
        prunedCount++;
        return 0;
      }
      return w;
    });

    return {
      prunedWeights: pruned,
      pruningThreshold: Number(pruningThreshold.toFixed(6)),
      sparsityRatio: Number((prunedCount / Math.max(1, total)).toFixed(4)),
      prunedWeightsCount: prunedCount,
      totalWeightsCount: total,
    };
  }
}
