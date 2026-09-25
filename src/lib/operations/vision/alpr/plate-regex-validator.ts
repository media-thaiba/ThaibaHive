export interface PlateFormatValidation {
  isValid: boolean;
  region: 'US' | 'EU' | 'GULF' | 'INDIA' | 'GENERIC';
  normalizedPlate: string;
}

export class PlateRegexValidator {
  // Regex patterns for various license plate formats
  private static patterns = [
    { region: 'US' as const, regex: /^[A-Z0-9]{1,7}$/ },
    { region: 'EU' as const, regex: /^[A-Z]{1,3}[- ]?[A-Z0-9]{1,4}[- ]?[A-Z0-9]{1,4}$/ },
    { region: 'GULF' as const, regex: /^[A-Z0-9]{1,2}[- ]?[0-9]{1,5}$/ },
    { region: 'INDIA' as const, regex: /^[A-Z]{2}[- ]?[0-9]{1,2}[- ]?[A-Z]{1,3}[- ]?[0-9]{4}$/ },
  ];

  public static validateAndNormalize(rawPlate: string): PlateFormatValidation {
    const cleaned = rawPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length < 3 || cleaned.length > 10) {
      return { isValid: false, region: 'GENERIC', normalizedPlate: cleaned };
    }

    for (const p of this.patterns) {
      if (p.regex.test(cleaned)) {
        return { isValid: true, region: p.region, normalizedPlate: cleaned };
      }
    }

    return { isValid: true, region: 'GENERIC', normalizedPlate: cleaned };
  }
}
