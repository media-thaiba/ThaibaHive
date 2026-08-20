import * as crypto from 'crypto';

/**
 * Masking Vector Engine for Secure Aggregation Pairwise Seed Derivation
 */
export class MaskingVectorEngine {
  /**
   * Deterministically generate pseudo-random float vector of length `dimension` from a seed string
   */
  public static generateMaskVector(seed: string, dimension: number): number[] {
    const mask = new Array(dimension);
    const hash = crypto.createHash('sha256').update(seed).digest();

    for (let i = 0; i < dimension; i++) {
      // Deterministic PRNG using HMAC-SHA256 counter
      const itemHash = crypto.createHmac('sha256', hash).update(Buffer.from(i.toString())).digest();
      const val = itemHash.readInt32LE(0) / 0x7fffffff; // range [-1.0, 1.0]
      mask[i] = val;
    }

    return mask;
  }

  /**
   * Derive symmetric shared seed for node pair (u, v)
   */
  public static derivePairwiseSeed(nodeA: string, nodeB: string, roundNumber: number): string {
    const sorted = [nodeA, nodeB].sort().join(':');
    return `secagg_seed:${sorted}:round_${roundNumber}`;
  }

  /**
   * Apply pairwise masks to a client update vector
   */
  public static maskVector(
    clientVector: number[],
    nodeId: string,
    allParticipants: string[],
    roundNumber: number
  ): number[] {
    const masked = [...clientVector];
    const dim = clientVector.length;

    for (const otherNode of allParticipants) {
      if (otherNode === nodeId) continue;

      const seed = this.derivePairwiseSeed(nodeId, otherNode, roundNumber);
      const pairMask = this.generateMaskVector(seed, dim);

      if (nodeId < otherNode) {
        // Add mask
        for (let i = 0; i < dim; i++) {
          masked[i] += pairMask[i];
        }
      } else {
        // Subtract mask
        for (let i = 0; i < dim; i++) {
          masked[i] -= pairMask[i];
        }
      }
    }

    return masked;
  }
}
