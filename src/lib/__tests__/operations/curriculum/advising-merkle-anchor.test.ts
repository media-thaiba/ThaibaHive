import { advisingMerkleAnchor } from '../../../operations/curriculum/security/advising-merkle-anchor';
import { AuditTrailVerifier } from '../../../operations/curriculum/security/audit-trail-verifier';
import { CurriculumAuditLogDto } from '../../../operations/curriculum/curriculum-types';

describe('Immutable Merkle Audit Anchor for Academic Advising (ADVISE-014)', () => {
  const verifier = new AuditTrailVerifier();

  it('should generate leaf hashes, anchor into Merkle root, and verify inclusion proofs', () => {
    const record: Partial<CurriculumAuditLogDto> = {
      auditId: 'clog_001',
      actionType: 'plan_approved',
      targetStudentId: 'stud_123',
      planId: 'plan_999',
      performedByUserId: 'advisor_456',
      actorRole: 'staff',
      auditTimestamp: '2026-08-21T10:00:00.000Z',
      justification: 'Approved standard 4-year degree plan.',
    };

    const { leafHash, merkleRoot, proof } = advisingMerkleAnchor.anchorAuditRecord(record);

    expect(leafHash.length).toBe(64);
    expect(merkleRoot.length).toBe(64);
    expect(proof).toContain('proof_');
    expect(advisingMerkleAnchor.verifyProof(leafHash, proof)).toBe(true);
  });

  it('should verify log integrity and detect tampered records', () => {
    const record1: CurriculumAuditLogDto = {
      id: 'id_1',
      auditId: 'clog_001',
      actionType: 'prerequisite_waived',
      targetStudentId: 'stud_1',
      planId: 'plan_1',
      performedByUserId: 'dean_1',
      actorRole: 'hod',
      justification: 'AP credit equivalency waiver',
      merkleProof: 'proof_1_abc',
      merkleAuditHash: '',
      auditTimestamp: '2026-08-21T10:00:00.000Z',
      institutionId: 'inst_1',
      createdAt: '',
    };
    record1.merkleAuditHash = advisingMerkleAnchor.hashRecord(record1);

    const validResult = verifier.verifyAuditLogIntegrity([record1]);
    expect(validResult.isIntegrityValid).toBe(true);

    // Tampered record
    const tamperedRecord = {
      ...record1,
      justification: 'TAMPERED UNAPPROVED WAIVER',
    };
    const invalidResult = verifier.verifyAuditLogIntegrity([tamperedRecord]);
    expect(invalidResult.isIntegrityValid).toBe(false);
    expect(invalidResult.brokenRecords).toContain('clog_001');
  });
});
