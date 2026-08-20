/**
 * Zero-Knowledge Membership Proof Generator
 * Sprint-042 (ARES) — ARES-010
 */

import { ZkProofGenerator } from './zk-proof-generator';
import { ZkMerkleVerifier } from './zk-merkle-verifier';
import { ZkAuditProofPayload, ZkAttestationCertificate } from './zkp-types';

export class ZkMembershipProofService {
  private static instance: ZkMembershipProofService | null = null;
  private prover: ZkProofGenerator;
  private verifier: ZkMerkleVerifier;

  private constructor(prover?: ZkProofGenerator, verifier?: ZkMerkleVerifier) {
    this.prover = prover || ZkProofGenerator.getInstance();
    this.verifier = verifier || ZkMerkleVerifier.getInstance();
  }

  public static getInstance(prover?: ZkProofGenerator, verifier?: ZkMerkleVerifier): ZkMembershipProofService {
    if (!ZkMembershipProofService.instance) {
      ZkMembershipProofService.instance = new ZkMembershipProofService(prover, verifier);
    }
    return ZkMembershipProofService.instance;
  }

  public proveAndVerifyAuditRecord(
    merkleRoot: string,
    rawAuditData: string,
    tenantId?: string
  ): { proof: ZkAuditProofPayload; attestation: ZkAttestationCertificate } {
    const proof = this.prover.generateProof(merkleRoot, rawAuditData, tenantId);
    const attestation = this.verifier.createAttestation(proof);
    return { proof, attestation };
  }
}
