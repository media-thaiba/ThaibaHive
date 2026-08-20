export interface TopKSparsityResult {
  sparseIndices: number[];
  sparseValues: number[];
  sparsityRatio: number;
  originalLength: number;
}

/**
 * Top-K Absolute Gradient Sparsifier
 */
export class TopKSparsifier {
  /**
   * Extract top k largest magnitude gradient elements
   */
  public static sparsify(vector: number[], topKRatio: number = 0.1): TopKSparsityResult {
    const n = vector.length;
    const k = Math.max(1, Math.floor(n * Math.min(1.0, Math.max(0.01, topKRatio))));

    // Index mapping with magnitude
    const indexed = vector.map((val, idx) => ({ idx, val, abs: Math.abs(val) }));
    indexed.sort((a, b) => b.abs - a.abs);

    const topK = indexed.slice(0, k);
    // Sort back by original index
    topK.sort((a, b) => a.idx - b.idx);

    const sparseIndices = topK.map((item) => item.idx);
    const sparseValues = topK.map((item) => item.val);

    return {
      sparseIndices,
      sparseValues,
      sparsityRatio: Number(((n - k) / n).toFixed(4)),
      originalLength: n,
    };
  }

  /**
   * Reconstruct full dense vector from Top-K sparse representation
   */
  public static desparsify(sparseResult: TopKSparsityResult): number[] {
    const dense = new Array(sparseResult.originalLength).fill(0);
    for (let i = 0; i < sparseResult.sparseIndices.length; i++) {
      dense[sparseResult.sparseIndices[i]] = sparseResult.sparseValues[i];
    }
    return dense;
  }
}
