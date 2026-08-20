import { academicPrivacyShield } from '@/lib/operations/km/governance/academic-privacy-shield';
import { kmAuditLogger } from '@/lib/operations/km/governance/km-audit-logger';

describe('FERPA/GDPR Academic Privacy Shield & Merkle Audit (KM-018)', () => {
  beforeEach(() => {
    kmAuditLogger.clear();
  });

  it('should redact sensitive PII (SSN, phone, email) from advising transcripts', () => {
    const rawStudentNotes = 'Student John Doe (SSN: 123-45-6789, Phone: (555) 123-4567, email: john@example.edu) discussed course dropping.';
    const result = academicPrivacyShield.redactStudentPii(rawStudentNotes);

    expect(result.piiDetected).toBe(true);
    expect(result.redactedTypes).toContain('SSN');
    expect(result.redactedTypes).toContain('PHONE');
    expect(result.redactedTypes).toContain('EMAIL');
    expect(result.sanitizedText).not.toContain('123-45-6789');
    expect(result.sanitizedText).toContain('[REDACTED_SSN]');
  });

  it('should enforce FERPA authorization rules', () => {
    const adminCheck = academicPrivacyShield.verifyFerpaAccess('user_admin_01', 'admin', 'std_999');
    expect(adminCheck).toBe(true);

    const ownStudentCheck = academicPrivacyShield.verifyFerpaAccess('std_999', 'student', 'std_999');
    expect(ownStudentCheck).toBe(true);

    const otherStudentCheck = academicPrivacyShield.verifyFerpaAccess('std_888', 'student', 'std_999');
    expect(otherStudentCheck).toBe(false);
  });

  it('should append events to Merkle audit chain and verify cryptographic integrity', () => {
    kmAuditLogger.logEvent('degree_audit', 'user_123', { studentId: 'std_999', status: 'approved' });
    kmAuditLogger.logEvent('query', 'user_123', { prompt: 'Check graduation' });

    expect(kmAuditLogger.getChainLength()).toBe(2);
    expect(kmAuditLogger.verifyChainIntegrity()).toBe(true);
  });
});
