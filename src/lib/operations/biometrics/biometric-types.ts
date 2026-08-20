/**
 * Edge Biometrics & Zero-Knowledge Proof (ZKP) Attendance Verification Types (AIMS / AutoOps)
 */

export interface BiometricEmbedding {
  templateId: string;
  userId: string;
  dimension: 128 | 512;
  vector: number[];
  enrolledAt: string;
  institutionId: string;
}

export interface MatchResult {
  matched: boolean;
  userId?: string;
  similarityScore: number; // 0.0 to 1.0 (Cosine similarity)
  confidence: number;
  matchingDurationMs: number;
}

export interface ZkBiometricProof {
  proofId: string;
  sessionEpoch: number;
  sessionMerkleRoot: string;
  nullifierHash: string; // Prevents replay attacks
  proofPayload: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: string[];
  generatedAt: string;
  institutionId: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  sessionId: string;
  campusId: string;
  locationName: string;
  timestamp: string;
  verificationMethod: 'EDGE_NEURAL_ZKP' | 'SMART_CARD_NFC' | 'SUPERVISOR_OVERRIDE';
  zkProofId?: string;
  syncStatus: 'LOCAL_BUFFERED' | 'SYNCED' | 'FAILED_CONFLICT';
  institutionId: string;
}
