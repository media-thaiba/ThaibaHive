import { ZkGradientVerifier } from '@/lib/operations/crypto/zk-gradient-verifier';
import { ZkGradientCircuits } from '@/lib/operations/crypto/zk-gradient-circuits';

describe('ZkGradientVerifier (Groth16 / BN254 Elliptic Curve Gradient Proofs)', () => {
  it('should generate and verify valid Groth16 gradient integrity proof', () => {
    const gradient = [0.1, -0.2, 0.3, -0.15];
    const l2Bound = 1.0;

    const proof = ZkGradientVerifier.generateProof('node_campus_1', 'afed_model_1', 1, gradient, l2Bound);
    expect(proof.proofId).toBeDefined();
    expect(proof.proof.pi_a).toHaveLength(2);
    expect(proof.proof.pi_b).toHaveLength(2);
    expect(proof.proof.pi_c).toHaveLength(2);

    const isValid = ZkGradientVerifier.verifyProof(proof);
    expect(isValid).toBe(true);
  });

  it('should reject proof if gradient exceeds L2 clipping bound', () => {
    const hugeGradient = [5.0, 10.0, 15.0];
    const l2Bound = 1.0;

    expect(() => {
      ZkGradientVerifier.generateProof('node_campus_1', 'afed_model_1', 1, hugeGradient, l2Bound);
    }).toThrow(/exceeds bound/);
  });

  it('should reject corrupted proof points not lying on BN254 curve', () => {
    const proof = ZkGradientVerifier.generateProof('node_1', 'model_1', 1, [0.1, 0.2], 1.0);
    // Corrupt pi_a coordinate
    proof.proof.pi_a[0] = '0x123456789abcdef';

    const isValid = ZkGradientVerifier.verifyProof(proof);
    expect(isValid).toBe(false);
  });
});
