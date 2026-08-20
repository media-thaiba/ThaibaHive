import { ZkBiometricCircuits } from '@/lib/operations/biometrics/zk-biometric-circuits';
import { ZkBiometricVerifier } from '@/lib/operations/biometrics/zk-biometric-verifier';

describe('AIMS-011 — ZkBiometricVerifier', () => {
  it('should verify valid zk-SNARK proof and reject replay attempts via nullifiers', () => {
    const verifier = new ZkBiometricVerifier();
    const sessionRoot = 'merkle_root_session_20260820';

    const proof = ZkBiometricCircuits.generateProof(
      'student_442',
      'session_morning_0830',
      'inst_001',
      1,
      sessionRoot
    );

    expect(proof.nullifierHash).toBeDefined();
    expect(proof.proofPayload.pi_a.length).toBe(2);

    // 1st verification: Must succeed
    const firstResult = verifier.verifyProof(proof, sessionRoot);
    expect(firstResult.valid).toBe(true);
    expect(firstResult.verificationLatencyMs).toBeLessThan(50);

    // 2nd verification: Must fail with replay rejection
    const replayResult = verifier.verifyProof(proof, sessionRoot);
    expect(replayResult.valid).toBe(false);
    expect(replayResult.reason).toContain('Proof replay detected');

    // Mismatched root: Must fail
    const wrongRootProof = ZkBiometricCircuits.generateProof(
      'student_999',
      'session_morning_0830',
      'inst_001',
      1,
      'other_root'
    );
    const mismatchResult = verifier.verifyProof(wrongRootProof, sessionRoot);
    expect(mismatchResult.valid).toBe(false);
    expect(mismatchResult.reason).toContain('Session Merkle root mismatch');
  });
});
