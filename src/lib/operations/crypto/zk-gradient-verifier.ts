import { ZkGradientProofPayload } from './smpc-types';
import { ZkGradientCircuits, BN254_FIELD_PRIME_Q, BN254_COEFF_B, modQ, modExp } from './zk-gradient-circuits';
import { Bn254PairingEngine } from './bn254-pairing';

/**
 * zk-SNARK Groth16 / BN254 Elliptic Curve Gradient Integrity Verifier
 */
export class ZkGradientVerifier {
  /**
   * Check if affine point (x, y) lies on BN254 curve: y^2 = x^3 + 3 (mod q)
   */
  public static isPointOnCurve(pointHex: [string, string]): boolean {
    try {
      const x = modQ(BigInt(pointHex[0]));
      const y = modQ(BigInt(pointHex[1]));

      const lhs = modQ(modExp(y, BigInt(2), BN254_FIELD_PRIME_Q));
      const rhs = modQ(modExp(x, BigInt(3), BN254_FIELD_PRIME_Q) + BN254_COEFF_B);

      return lhs === rhs;
    } catch {
      return false;
    }
  }

  /**
   * Generate a cryptographic Groth16 / BN254 zk-SNARK proof for client gradient bounds
   */
  public static generateProof(
    nodeId: string,
    modelId: string,
    roundNumber: number,
    gradientVector: number[],
    l2ClipNormLimit: number,
    merkleDatasetRoot: string = '0xmerkle_root_default'
  ): ZkGradientProofPayload {
    return ZkGradientCircuits.generateGroth16Proof(
      nodeId,
      modelId,
      roundNumber,
      gradientVector,
      l2ClipNormLimit,
      merkleDatasetRoot
    );
  }

  /**
   * Verify zk-SNARK Groth16 proof pairing constraints and curve points on BN254
   */
  public static verifyProof(proofPayload: ZkGradientProofPayload): boolean {
    if (!proofPayload || !proofPayload.proof || !proofPayload.publicSignals) {
      return false;
    }

    const { pi_a, pi_b, pi_c } = proofPayload.proof;
    if (!pi_a || pi_a.length < 2 || !pi_b || pi_b.length < 2 || !pi_c || pi_c.length < 2) {
      return false;
    }

    // 1. Verify G1 curve membership for pi_a and pi_c
    if (!this.isPointOnCurve([pi_a[0], pi_a[1]]) || !this.isPointOnCurve([pi_c[0], pi_c[1]])) {
      return false;
    }

    // 2. Verify G2 component points for pi_b
    if (!this.isPointOnCurve([pi_b[0][0], pi_b[0][1]]) || !this.isPointOnCurve([pi_b[1][0], pi_b[1][1]])) {
      return false;
    }

    // 3. Verify public signal bounds
    if (proofPayload.publicSignals.l2ClipNormLimit <= 0 || proofPayload.publicSignals.gradientDimension <= 0) {
      return false;
    }

    // 4. Verify challenge roots
    if (!proofPayload.publicSignals.epochChallenge || !proofPayload.publicSignals.merkleDatasetRoot) {
      return false;
    }

    // 5. Full BN254 Optimal Ate Bilinear Pairing Check (Sprint-046 TD-044-04 Resolution)
    const publicInputs = [
      BigInt(Math.round(proofPayload.publicSignals.l2ClipNormLimit * 1000)),
      BigInt(proofPayload.publicSignals.gradientDimension),
    ];

    const pairingValid = Bn254PairingEngine.verifyPairingProduct(
      [pi_a[0], pi_a[1]],
      [
        [pi_b[0][0], pi_b[0][1]],
        [pi_b[1][0], pi_b[1][1]],
      ],
      [pi_c[0], pi_c[1]],
      publicInputs
    );
    if (!pairingValid) {
      return false;
    }

    return true;
  }
}
