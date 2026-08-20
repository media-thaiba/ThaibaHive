/**
 * Zero-Knowledge Compliance Attestation Service
 * Sprint-042 (ARES) — ARES-011
 */

import { ZkMerkleVerifier } from './zk-merkle-verifier';
import { ZkProofGenerator } from './zk-proof-generator';
import { ZkAuditProofPayload, ZkAttestationCertificate } from './zkp-types';

export class ZkAttestationService {
  private static instance: ZkAttestationService | null = null;
  private verifier: ZkMerkleVerifier;
  private prover: ZkProofGenerator;
  private proofs: Map<string, ZkAuditProofPayload> = new Map();
  private attestations: Map<string, ZkAttestationCertificate> = new Map();

  private constructor() {
    this.verifier = ZkMerkleVerifier.getInstance();
    this.prover = ZkProofGenerator.getInstance();
  }

  public static getInstance(): ZkAttestationService {
    if (!ZkAttestationService.instance) {
      ZkAttestationService.instance = new ZkAttestationService();
    }
    return ZkAttestationService.instance;
  }

  public generateAndStoreProof(
    merkleRoot: string,
    rawAuditData: string,
    tenantId: string = 'tenant-master'
  ): ZkAuditProofPayload {
    const proof = this.prover.generateProof(merkleRoot, rawAuditData, tenantId);
    this.proofs.set(proof.proofId, proof);
    return proof;
  }

  public verifyProofAndIssueAttestation(
    proofId: string,
    framework: ZkAttestationCertificate['complianceFramework'] = 'SOC2_TYPE_II'
  ): ZkAttestationCertificate | null {
    const proof = this.proofs.get(proofId);
    if (!proof) return null;

    const attestation = this.verifier.createAttestation(proof, framework);
    this.attestations.set(attestation.attestationId, attestation);
    return attestation;
  }

  public verifyExternalProofPayload(
    payload: ZkAuditProofPayload,
    framework: ZkAttestationCertificate['complianceFramework'] = 'SOC2_TYPE_II'
  ): ZkAttestationCertificate {
    return this.verifier.createAttestation(payload, framework);
  }

  public getProof(proofId: string): ZkAuditProofPayload | undefined {
    return this.proofs.get(proofId);
  }

  public listProofs(): ZkAuditProofPayload[] {
    return Array.from(this.proofs.values());
  }

  public listAttestations(): ZkAttestationCertificate[] {
    return Array.from(this.attestations.values());
  }
}
