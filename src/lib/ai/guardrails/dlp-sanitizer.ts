export interface DlpSanitizeResult {
  sanitizedText: string;
  maskedFieldsCount: number;
  containsMedicalPii: boolean;
  containsFinancialPii: boolean;
  requiresLocalInference: boolean;
  maskedItems: Array<{ type: string; originalLength: number }>;
}

export class DlpSanitizer {
  // Regex patterns for sensitive identifiers
  private creditCardPattern = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
  private aadhaarPattern = /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g;
  private panPattern = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g;
  private ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;
  private phonePattern = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

  // Medical keyword indicators
  private medicalKeywords = [
    "diagnosis",
    "prescription",
    "medical certificate",
    "illness",
    "disease",
    "doctor",
    "hospital",
    "clinic",
    "pathology",
    "symptoms",
    "treatment",
  ];

  sanitizeInput(text: string): DlpSanitizeResult {
    let sanitized = text;
    let maskedFieldsCount = 0;
    const maskedItems: Array<{ type: string; originalLength: number }> = [];

    // 1. Mask Credit Card numbers (16 digits - must run before 12-digit Aadhaar pattern)
    sanitized = sanitized.replace(this.creditCardPattern, (match) => {
      maskedFieldsCount++;
      maskedItems.push({ type: "CREDIT_CARD", originalLength: match.length });
      return "[REDACTED_CARD]";
    });

    // 2. Mask Aadhaar / National ID (12 digits)
    sanitized = sanitized.replace(this.aadhaarPattern, (match) => {
      maskedFieldsCount++;
      maskedItems.push({ type: "AADHAAR", originalLength: match.length });
      return "[REDACTED_AADHAAR]";
    });

    // 3. Mask PAN numbers
    sanitized = sanitized.replace(this.panPattern, (match) => {
      maskedFieldsCount++;
      maskedItems.push({ type: "PAN", originalLength: match.length });
      return "[REDACTED_PAN]";
    });

    // 4. Mask SSN
    sanitized = sanitized.replace(this.ssnPattern, (match) => {
      maskedFieldsCount++;
      maskedItems.push({ type: "SSN", originalLength: match.length });
      return "[REDACTED_SSN]";
    });

    // 5. Mask Phone numbers
    sanitized = sanitized.replace(this.phonePattern, (match) => {
      maskedFieldsCount++;
      maskedItems.push({ type: "PHONE", originalLength: match.length });
      return "[REDACTED_PHONE]";
    });

    const lowerText = text.toLowerCase();
    const containsMedicalPii = this.medicalKeywords.some((keyword) => lowerText.includes(keyword));
    const containsFinancialPii = maskedItems.some((item) => item.type === "CREDIT_CARD" || item.type === "PAN");

    // Local-first policy for medical certs & high PII count
    const requiresLocalInference = containsMedicalPii || maskedFieldsCount >= 3;

    return {
      sanitizedText: sanitized,
      maskedFieldsCount,
      containsMedicalPii,
      containsFinancialPii,
      requiresLocalInference,
      maskedItems,
    };
  }

  scrubOutput(text: string): string {
    return text
      .replace(this.creditCardPattern, "[REDACTED_CARD]")
      .replace(this.aadhaarPattern, "[REDACTED_AADHAAR]")
      .replace(this.panPattern, "[REDACTED_PAN]")
      .replace(this.ssnPattern, "[REDACTED_SSN]")
      .replace(this.phonePattern, "[REDACTED_PHONE]");
  }
}

export const dlpSanitizer = new DlpSanitizer();
