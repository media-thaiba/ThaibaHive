/**
 * Adaptive Gradient Clipper with empirical DP quantile estimation
 */
export class AdaptiveGradientClipper {
  /**
   * Clip gradient vector to L2-norm threshold C
   */
  public static clip(vector: number[], threshold: number): { clipped: number[]; norm: number; wasClipped: boolean } {
    let sumSq = 0;
    for (let i = 0; i < vector.length; i++) {
      sumSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSq);
    const wasClipped = norm > threshold;
    const factor = wasClipped && norm > 0 ? threshold / norm : 1.0;

    const clipped = vector.map((v) => v * factor);
    return { clipped, norm, wasClipped };
  }

  /**
   * Adaptively adjust threshold C based on historical gradient norms (target median percentile)
   */
  public static adaptThreshold(
    currentThreshold: number,
    observedNorms: number[],
    targetQuantile: number = 0.5,
    learningRate: number = 0.1
  ): number {
    if (!observedNorms || observedNorms.length === 0) return currentThreshold;

    const sorted = [...observedNorms].sort((a, b) => a - b);
    const quantileIdx = Math.floor(sorted.length * targetQuantile);
    const empiricalQuantile = sorted[Math.min(sorted.length - 1, quantileIdx)];

    // Multiplicative update rule: C_{t+1} = C_t * exp(-lr * (empirical - C_t) / C_t)
    const relativeDiff = (empiricalQuantile - currentThreshold) / Math.max(1e-4, currentThreshold);
    const updatedThreshold = currentThreshold * Math.exp(learningRate * Math.max(-1.0, Math.min(1.0, relativeDiff)));

    return Number(Math.max(0.01, Math.min(100.0, updatedThreshold)).toFixed(4));
  }
}
