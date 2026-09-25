import { facilityMerkleAnchor } from '../../../operations/facility/security/facility-merkle-anchor';
import { AuditTrailVerifier } from '../../../operations/facility/security/audit-trail-verifier';

describe('Immutable Merkle Audit Anchor for Facilities (Sprint-052 FACILITY-014)', () => {
  beforeEach(() => {
    facilityMerkleAnchor.clear();
  });

  it('should generate unbroken SHA-256 Merkle root and verify inclusion proofs', () => {
    const log1 = {
      auditId: 'AUDIT_01',
      actorId: 'tech_alice',
      actorRole: 'staff',
      action: 'work_order_completed',
      entityType: 'facility_work_orders',
      entityId: 'WO-101',
      payloadHash: 'hash_101',
      timestamp: '2026-08-21T10:00:00Z',
    };

    const log2 = {
      auditId: 'AUDIT_02',
      actorId: 'mgr_bob',
      actorRole: 'admin',
      action: 'work_order_verified',
      entityType: 'facility_work_orders',
      entityId: 'WO-101',
      payloadHash: 'hash_102',
      timestamp: '2026-08-21T10:15:00Z',
    };

    const anchor1 = facilityMerkleAnchor.anchorAuditRecord(log1);
    const anchor2 = facilityMerkleAnchor.anchorAuditRecord(log2);

    expect(anchor1.merkleRoot).toBeDefined();
    expect(anchor2.merkleRoot).not.toEqual(anchor1.merkleRoot);
    expect(facilityMerkleAnchor.verifyProof(anchor1.leafHash, anchor1.proof)).toBe(true);
    expect(facilityMerkleAnchor.verifyProof(anchor2.leafHash, anchor2.proof)).toBe(true);

    const verification = AuditTrailVerifier.verifyLogChain([log1, log2] as any);
    expect(verification.valid).toBe(true);
    expect(verification.totalVerified).toBe(2);
  });
});
