/**
 * Unit tests for ZkProofGenerator & Merkle Circuit (ARES-009)
 */

import { ZkProofGenerator } from '@/lib/security/zkp/zk-proof-generator';
import { AUDIT_MEMBERSHIP_CIRCUIT_SPEC } from '@/lib/security/zkp/zk-circuit-spec';

describe('ARES-009: ZkProofGenerator', () => {
  it('should have valid circuit specifications for audit membership', () => {
    expect(AUDIT_MEMBERSHIP_CIRCUIT_SPEC.name).toBe('AuditLeafMembershipVerifier');
    expect(AUDIT_MEMBERSHIP_CIRCUIT_SPEC.r1csConstraintsCount).toBe(2048);
    expect(AUDIT_MEMBERSHIP_CIRCUIT_SPEC.publicSignalCount).toBe(2);
  });

  it('should generate valid Groth16 zk-SNARK proof on BN128 curve', () => {
    const prover = ZkProofGenerator.getInstance();
    const merkleRoot = 'a6b4e99f0123456789abcdef0123456789abcdef0123456789abcdef01234567';
    const auditRecordPreimage = JSON.stringify({
      tenantId: 'tenant-1',
      action: 'ZASM_POLICY_APPLIED',
      timestamp: '2026-08-20T00:00:00Z',
    });

    const payload = prover.generateProof(merkleRoot, auditRecordPreimage, 'tenant-1');

    expect(payload.proofId).toBeDefined();
    expect(payload.merkleRoot).toBe(merkleRoot);
    expect(payload.proof.protocol).toBe('groth16');
    expect(payload.proof.curve).toBe('bn128');
    expect(payload.proof.pi_a.length).toBe(2);
    expect(payload.proof.pi_b.length).toBe(2);
    expect(payload.proof.pi_c.length).toBe(2);
  });
});
