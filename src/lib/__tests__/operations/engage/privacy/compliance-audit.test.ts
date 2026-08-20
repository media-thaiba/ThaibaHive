import { ComplianceAuditLogger } from '../../../../operations/engage/privacy/compliance-audit';
import { EngageDbStore } from '../../../../db/engage-store';

describe('EngageOS ComplianceAuditLogger & Cryptographic Merkle Chain', () => {
  let auditLogger: ComplianceAuditLogger;
  let store: EngageDbStore;

  beforeEach(() => {
    auditLogger = ComplianceAuditLogger.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should create verifiable Merkle chain of consent mutations', () => {
    const b1 = auditLogger.logConsentMutation('user_1', 'opt_out', { channel: 'sms' }, 'inst_test');
    const b2 = auditLogger.logConsentMutation('user_2', 'opt_in', { channel: 'email' }, 'inst_test');

    expect(b2.previousBlockHash).toBe(b1.payloadHash);

    const integrity = auditLogger.verifyChainIntegrity();
    expect(integrity.isValid).toBe(true);
    expect(integrity.blockCount).toBeGreaterThanOrEqual(2);
  });

  it('should export GDPR DSAR package for student communication history', async () => {
    await store.saveMessageAsync({
      messageId: 'msg_dsar_1',
      recipientId: 'student_dsar_user',
      channel: 'email',
      subject: 'Exam notification',
      body: 'Your exam is scheduled',
      institutionId: 'inst_test',
    });

    const dsar = await auditLogger.exportDsarPackage('student_dsar_user', 'inst_test');
    expect(dsar.recipientId).toBe('student_dsar_user');
    expect(dsar.communicationHistory.length).toBe(1);
    expect(dsar.gdprLawfulBasis).toContain('GDPR Article 6');
  });
});
