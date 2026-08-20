/**
 * Unit tests for ZkMerkleVerifier & Attestation (ARES-010 & ARES-011)
 */

import { ZkMerkleVerifier } from '@/lib/security/zkp/zk-merkle-verifier';
import { ZkProofGenerator } from '@/lib/security/zkp/zk-proof-generator';
import { ZkAttestationService } from '@/lib/security/zkp/zk-attestation-service';

describe('ARES-010 & ARES-011: ZkMerkleVerifier & ZkAttestationService', () => {
  const prover = ZkProofGenerator.getInstance();
  const verifier = ZkMerkleVerifier.getInstance();
  const attestationService = ZkAttestationService.getInstance();
  const merkleRoot = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

  it('should verify a valid generated zk-SNARK proof successfully in < 50ms', () => {
    const payload = prover.generateProof(merkleRoot, 'audit-log-preimage-data-xyz');
    const start = Date.now();
    const isValid = verifier.verifyProof(payload);
    const duration = Date.now() - start;

    expect(isValid).toBe(true);
    expect(duration).toBeLessThan(50);
  });

  it('should reject tampered or corrupted proof elements', () => {
    const payload = prover.generateProof(merkleRoot, 'audit-log-preimage-data-xyz');
    const tamperedPayload = {
      ...payload,
      proof: {
        ...payload.proof,
        pi_a: ['corrupted-element-1', payload.proof.pi_a[1]] as [string, string],
      },
    };

    const isValid = verifier.verifyProof(tamperedPayload);
    expect(isValid).toBe(false);
  });

  it('should generate and verify attestation certificate via service', () => {
    const proof = attestationService.generateAndStoreProof(merkleRoot, 'audit-event-record');
    const cert = attestationService.verifyProofAndIssueAttestation(proof.proofId, 'GDPR');

    expect(cert).not.toBeNull();
    expect(cert?.isValid).toBe(true);
    expect(cert?.complianceFramework).toBe('GDPR');
    expect(cert?.issuerSignature).toBeDefined();
  });
});
