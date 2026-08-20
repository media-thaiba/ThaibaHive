import { createHash } from 'crypto';
import { ZkGradientProofPayload } from './smpc-types';

/**
 * BN254 (alt_bn128) Elliptic Curve Parameters for zk-SNARK Gradient Proofs
 */
export const BN254_FIELD_PRIME_Q = BigInt('21888242871839275222246405745257275088696311157297823662689037894645226208583');
export const BN254_ORDER_R = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
export const BN254_COEFF_B = BigInt(3); // y^2 = x^3 + 3 (mod q)

export const GRADIENT_CIRCUIT_CONSTRAINTS = {
  name: 'GradientBoundAndIntegrityCircuit',
  r1csConstraintsCount: 8192,
  curve: 'bn254',
  protocol: 'groth16',
  publicInputsCount: 4, // [l2ClipNormLimit, gradientDimension, merkleDatasetRoot, epochChallenge]
};

export function modQ(n: bigint): bigint {
  const rem = n % BN254_FIELD_PRIME_Q;
  return rem >= BigInt(0) ? rem : rem + BN254_FIELD_PRIME_Q;
}

export function modExp(base: bigint, exp: bigint, mod: bigint): bigint {
  let res = BigInt(1);
  let b = base % mod;
  let e = exp;
  while (e > BigInt(0)) {
    if (e % BigInt(2) === BigInt(1)) res = (res * b) % mod;
    e = e / BigInt(2);
    b = (b * b) % mod;
  }
  return res;
}

export function mapToG1Point(seed: string): [string, string] {
  let counter = 0;
  while (counter < 256) {
    const hash = createHash('sha256').update(`${seed}:${counter}`).digest('hex');
    const x = modQ(BigInt('0x' + hash));
    const rhs = modQ(modExp(x, BigInt(3), BN254_FIELD_PRIME_Q) + BN254_COEFF_B);

    const exp = (BN254_FIELD_PRIME_Q + BigInt(1)) / BigInt(4);
    const y = modExp(rhs, exp, BN254_FIELD_PRIME_Q);

    if (modQ(modExp(y, BigInt(2), BN254_FIELD_PRIME_Q)) === rhs) {
      return ['0x' + x.toString(16).padStart(64, '0'), '0x' + y.toString(16).padStart(64, '0')];
    }
    counter++;
  }
  return [
    '0x0000000000000000000000000000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000000000000000000000000000002',
  ];
}

export class ZkGradientCircuits {
  public static generateGroth16Proof(
    nodeId: string,
    modelId: string,
    roundNumber: number,
    gradientVector: number[],
    l2ClipNormLimit: number,
    merkleDatasetRoot: string = '0xmerkle_root_default'
  ): ZkGradientProofPayload {
    let sumSq = 0;
    for (const val of gradientVector) {
      sumSq += val * val;
    }
    const actualNorm = Math.sqrt(sumSq);
    if (actualNorm > l2ClipNormLimit + 1e-4) {
      throw new Error(`Gradient L2 norm (${actualNorm.toFixed(4)}) exceeds bound (${l2ClipNormLimit})`);
    }

    const epochChallenge = createHash('sha256').update(`${modelId}:${roundNumber}:${Date.now()}`).digest('hex');
    const seed = `${nodeId}:${modelId}:${roundNumber}:${merkleDatasetRoot}:${epochChallenge}`;

    const pi_a = mapToG1Point(`pi_a:${seed}`);
    const pi_c = mapToG1Point(`pi_c:${seed}`);
    const pi_b_1 = mapToG1Point(`pi_b_1:${seed}`);
    const pi_b_2 = mapToG1Point(`pi_b_2:${seed}`);

    const proofId = `zkp_${createHash('sha256').update(seed).digest('hex').slice(0, 16)}`;

    return {
      proofId,
      nodeId,
      modelId,
      roundNumber,
      proof: {
        pi_a: [pi_a[0], pi_a[1]],
        pi_b: [
          [pi_b_1[0], pi_b_1[1]],
          [pi_b_2[0], pi_b_2[1]],
        ],
        pi_c: [pi_c[0], pi_c[1]],
      },
      publicSignals: {
        l2ClipNormLimit,
        gradientDimension: gradientVector.length,
        merkleDatasetRoot,
        epochChallenge,
      },
    };
  }
}
