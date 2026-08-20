/**
 * Homomorphic Vector Primitives & Additive Ciphertext Aggregation
 */
export class HomomorphicPrimitives {
  /**
   * Additively aggregate multiple encrypted or masked float vectors
   */
  public static addVectors(vectors: number[][]): number[] {
    if (!vectors || vectors.length === 0) return [];
    const dim = vectors[0].length;
    const result = new Array(dim).fill(0);

    for (const vec of vectors) {
      for (let i = 0; i < dim; i++) {
        result[i] += vec[i] || 0;
      }
    }
    return result;
  }

  /**
   * Subtract vector B from vector A
   */
  public static subtractVector(vecA: number[], vecB: number[]): number[] {
    const dim = Math.min(vecA.length, vecB.length);
    const result = new Array(dim);
    for (let i = 0; i < dim; i++) {
      result[i] = vecA[i] - vecB[i];
    }
    return result;
  }

  /**
   * Scalar multiply vector by alpha
   */
  public static scaleVector(vector: number[], scalar: number): number[] {
    return vector.map((v) => v * scalar);
  }
}
