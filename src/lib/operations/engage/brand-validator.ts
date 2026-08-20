export interface BrandValidationResult {
  isCompliant: boolean;
  score: number; // 0.0 to 1.0
  violations: string[];
  warnings: string[];
}

export class BrandValidator {
  private static instance: BrandValidator;

  // Prohibited aggressive or deceptive phrases
  private readonly prohibitedKeywords = [
    'PENALTY IMMEDIATELY',
    'POLICE ACTION',
    'IMMEDIATE ARREST',
    'SEND BITCOIN',
    'CLICK HERE OR DIE',
    'CONFIDENTIAL PASSWORD',
  ];

  public static getInstance(): BrandValidator {
    if (!BrandValidator.instance) {
      BrandValidator.instance = new BrandValidator();
    }
    return BrandValidator.instance;
  }

  public validateTemplate(
    content: string,
    channel: string = 'email',
    options?: { requireUnsubscribe?: boolean; requireInstitutionName?: boolean }
  ): BrandValidationResult {
    const violations: string[] = [];
    const warnings: string[] = [];
    const upperContent = content.toUpperCase();

    // 1. Check Prohibited Phrases
    for (const kw of this.prohibitedKeywords) {
      if (upperContent.includes(kw)) {
        violations.push(`Template contains prohibited high-risk keyword: "${kw}"`);
      }
    }

    // 2. Check Unsubscribe Link requirement for promotional/general Email
    if (channel === 'email' && options?.requireUnsubscribe !== false) {
      const hasUnsubscribe =
        upperContent.includes('UNSUBSCRIBE') ||
        upperContent.includes('OPT-OUT') ||
        upperContent.includes('PREFERENCE');
      if (!hasUnsubscribe) {
        warnings.push('Email template is missing an explicit unsubscribe or preference link footer');
      }
    }

    // 3. Excess ALL-CAPS detection (aggressive tone)
    const words = content.split(/\s+/).filter((w) => w.length > 3);
    const allCapsWords = words.filter((w) => /^[A-Z0-9!?:;.]+$/.test(w));
    if (words.length > 5 && allCapsWords.length / words.length > 0.4) {
      warnings.push('Excessive uppercase text detected (>40% of words), which may appear aggressive');
    }

    const isCompliant = violations.length === 0;
    const penalty = violations.length * 0.4 + warnings.length * 0.1;
    const score = Math.max(0, parseFloat((1.0 - penalty).toFixed(2)));

    return {
      isCompliant,
      score,
      violations,
      warnings,
    };
  }
}
