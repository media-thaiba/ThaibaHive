import { HomomorphicPrimitives } from '@/lib/operations/crypto/homomorphic-primitives';
import { MaskingVectorEngine } from '@/lib/operations/crypto/masking-vector-engine';

describe('HomomorphicPrimitives & MaskingVectorEngine', () => {
  it('should additively combine vectors homomorphically', () => {
    const v1 = [1.0, 2.0, 3.0];
    const v2 = [4.0, 5.0, 6.0];
    const sum = HomomorphicPrimitives.addVectors([v1, v2]);
    expect(sum).toEqual([5.0, 7.0, 9.0]);
  });

  it('should generate symmetric pairwise masks that cancel out to 0 between pairs', () => {
    const dim = 10;
    const roundNumber = 1;
    const nodeA = 'node_1';
    const nodeB = 'node_2';

    const seed = MaskingVectorEngine.derivePairwiseSeed(nodeA, nodeB, roundNumber);
    const maskA = MaskingVectorEngine.generateMaskVector(seed, dim);
    const maskB = MaskingVectorEngine.generateMaskVector(seed, dim);

    // In maskVector: nodeA (< nodeB) adds mask, nodeB (> nodeA) subtracts mask
    const maskedA = maskA;
    const maskedB = maskB.map((v) => -v);

    const sum = HomomorphicPrimitives.addVectors([maskedA, maskedB]);
    for (let i = 0; i < dim; i++) {
      expect(sum[i]).toBeCloseTo(0, 5);
    }
  });
});
