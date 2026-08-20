/**
 * Zero-Knowledge Proof (ZKP) Audit Verification Types
 * Sprint-042 (ARES) — ARES-009
 */

export interface ZkSnarkProof {
  pi_a: [string, string];
  pi_b: [[string, string], [string, string]];
  pi_c: [string, string];
  protocol: 'groth16' | 'plonk';
  curve: 'bn128' | 'bls12381';
}

export interface ZkAuditProofPayload {
  proofId: string;
  merkleRoot: string;
  epochTimestamp: string;
  leafHashCommitment: string;
  proof: ZkSnarkProof;
  publicInputs: string[];
  tenantId: string;
  generatedAt: string;
}

export interface ZkAttestationCertificate {
  attestationId: string;
  merkleRoot: string;
  epoch: string;
  complianceFramework: 'SOC2_TYPE_II' | 'GDPR' | 'HIPAA' | 'ISO_27001';
  isValid: boolean;
  verifiedAt: string;
  issuerSignature: string;
}

export interface ZkCircuitConstraint {
  name: string;
  r1csConstraintsCount: number;
  publicSignalCount: number;
  privateSignalCount: number;
}
