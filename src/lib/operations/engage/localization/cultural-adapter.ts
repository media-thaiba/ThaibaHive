export interface CulturalContext {
  locale: string; // e.g. 'ar-SA', 'en-US', 'hi-IN', 'ml-IN'
  relationship: 'student' | 'parent' | 'staff' | 'alumni';
}

export class CulturalAdapter {
  private static instance: CulturalAdapter;

  public static getInstance(): CulturalAdapter {
    if (!CulturalAdapter.instance) {
      CulturalAdapter.instance = new CulturalAdapter();
    }
    return CulturalAdapter.instance;
  }

  public getSalutation(name: string, context: CulturalContext): string {
    const lang = context.locale.split('-')[0].toLowerCase();

    if (lang === 'ar') {
      if (context.relationship === 'parent') return `السلام عليكم ورحمة الله وبركاته، ولي أمر الطالب ${name} المحترم`;
      return `السلام عليكم ورحمة الله وبركاته، عزيزي الطالب ${name}`;
    }

    if (lang === 'hi') {
      if (context.relationship === 'parent') return `नमस्ते, आदरणीय अभिभावक (${name})`;
      return `नमस्ते, प्रिय ${name}`;
    }

    if (lang === 'ml') {
      if (context.relationship === 'parent') return `നമസ്കാരം, ബഹുമാനപ്പെട്ട രക്ഷിതാവ് (${name})`;
      return `പ്രിയ ${name}`;
    }

    // Default English
    if (context.relationship === 'parent') return `Dear Esteemed Parent of ${name},`;
    return `Dear ${name},`;
  }

  public formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  }

  public formatDate(date: Date, locale = 'en-US'): string {
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
    } catch {
      return date.toISOString().split('T')[0];
    }
  }
}
