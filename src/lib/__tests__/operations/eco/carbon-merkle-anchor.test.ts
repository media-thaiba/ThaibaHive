import { CarbonMerkleAnchor } from '../../../operations/eco/security/carbon-merkle-anchor';
import { EsgAuditVerifier } from '../../../operations/eco/security/esg-audit-verifier';

describe('CarbonMerkleAnchor & EsgAuditVerifier Unit Tests', () => {
  let anchor: CarbonMerkleAnchor;

  beforeEach(() => {
    anchor = CarbonMerkleAnchor.getInstance();
    anchor.clearChain();
  });

  it('should record consecutive audit blocks and verify unbroken hash chain integrity', () => {
    anchor.recordAuditBlock(
      'emission_recorded',
      'user_analyst_01',
      { emissionId: 'em_001', co2eKg: 420.5 },
      'inst_alpha'
    );

    anchor.recordAuditBlock(
      'bess_dispatched',
      'ai_bess_optimizer',
      { batteryId: 'bat_01', action: 'discharge', powerKw: 150 },
      'inst_alpha'
    );

    anchor.recordAuditBlock(
      'offset_retired',
      'user_sustainability_lead',
      { offsetId: 'off_001', cert: 'VCS-2026-987' },
      'inst_alpha'
    );

    const check = anchor.verifyChainIntegrity();
    expect(check.isValid).toBe(true);
    expect(check.checkedBlocks).toBe(3);

    const auditVerification = EsgAuditVerifier.verifyInstitutionalEsgAudit('inst_alpha');
    expect(auditVerification.isCompliant).toBe(true);
    expect(auditVerification.tamperDetected).toBe(false);
    expect(auditVerification.antiGreenwashingScorePercent).toBe(100);
  });

  it('should detect unauthorized tampering within the Merkle audit chain', () => {
    anchor.recordAuditBlock('emission_recorded', 'user_1', { co2eKg: 100 }, 'inst_alpha');
    anchor.recordAuditBlock('emission_recorded', 'user_2', { co2eKg: 200 }, 'inst_alpha');

    // Simulate malicious tampering of block 0 payload
    const trail = (anchor as any).auditChain;
    trail[0].payloadHash = '0000000000000000000000000000000000000000000000000000000000000000';

    const check = anchor.verifyChainIntegrity();
    expect(check.isValid).toBe(false);
    expect(check.brokenBlockIndex).toBe(0);

    const auditVerification = EsgAuditVerifier.verifyInstitutionalEsgAudit('inst_alpha');
    expect(auditVerification.tamperDetected).toBe(true);
    expect(auditVerification.antiGreenwashingScorePercent).toBe(0);
  });
});
