export interface RedactionResult {
  sanitizedText: string;
  piiDetected: boolean;
  redactedTypes: string[];
}

export class AcademicPrivacyShield {
  /**
   * Redacts sensitive student PII (National IDs, SSNs, phone numbers, personal emails) before LLM prompt assembly.
   */
  public redactStudentPii(text: string): RedactionResult {
    const redactedTypes: string[] = [];
    let sanitized = text;

    // SSN pattern: 000-00-0000
    if (/\b\d{3}-\d{2}-\d{4}\b/g.test(sanitized)) {
      sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');
      redactedTypes.push('SSN');
    }

    // Phone numbers: (123) 456-7890 or +1-234-567-8900
    if (/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g.test(sanitized)) {
      sanitized = sanitized.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');
      redactedTypes.push('PHONE');
    }

    // Email addresses
    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g.test(sanitized)) {
      sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]');
      redactedTypes.push('EMAIL');
    }

    return {
      sanitizedText: sanitized,
      piiDetected: redactedTypes.length > 0,
      redactedTypes,
    };
  }

  /**
   * FERPA Compliance check: Ensures requesting user is authorized to access student academic record.
   */
  public verifyFerpaAccess(callerUserId: string, callerRole: string, targetStudentId: string): boolean {
    if (callerRole === 'super_admin' || callerRole === 'admin' || callerRole === 'principal' || callerRole === 'hod') {
      return true;
    }
    if (callerRole === 'student' && callerUserId === targetStudentId) {
      return true;
    }
    return false;
  }
}

export const academicPrivacyShield = new AcademicPrivacyShield();
