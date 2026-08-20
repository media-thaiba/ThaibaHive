/**
 * SMPC & Cryptographic Secret Sharing Types (A-FED / EdgeMesh)
 */

export interface SecretShare {
  shareIndex: number; // 1 <= x <= n
  shareValue: bigint; // y = f(x) mod p
}

export interface MaskedClientPayload {
  nodeId: string;
  roundNumber: number;
  maskedVector: number[];
  encryptedShares: Record<string, string>; // recipientNodeId -> encrypted seed share
  zkProof?: string;
  timestamp: string;
}

export interface SecAggSession {
  sessionId: string;
  modelId: string;
  roundNumber: number;
  threshold: number; // minimum active nodes t
  participants: string[];
  activePhase: 'KEY_EXCHANGE' | 'MASKED_COLLECTION' | 'UNMASKING' | 'AGGREGATED' | 'FAILED';
  receivedMaskedPayloads: Map<string, MaskedClientPayload>;
  dropoutNodeIds: string[];
  finalAggregatedVector?: number[];
  createdAt: string;
}

export interface ZkGradientProofPayload {
  proofId: string;
  nodeId: string;
  modelId: string;
  roundNumber: number;
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: {
    l2ClipNormLimit: number;
    gradientDimension: number;
    merkleDatasetRoot: string;
    epochChallenge: string;
  };
}
