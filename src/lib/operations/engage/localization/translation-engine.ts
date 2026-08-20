import { TranslationCache } from './translation-cache';

export interface TranslationResult {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  fromCache: boolean;
  isRtl: boolean;
}

export class TranslationEngine {
  private static instance: TranslationEngine;
  private cache: TranslationCache;

  // Curated lexicon for institutional terms across major languages
  private readonly mockDictionary: Record<string, Record<string, string>> = {
    ar: {
      'Fee Reminder': 'تذكير بالرسوم',
      'Important Update': 'تحديث هام',
      'Attendance Alert': 'تنبيه الحضور',
      'Midterm exams commence next week': 'تبدأ الامتحانات النصفية الأسبوع المقبل',
      'Welcome to campus': 'مرحبا بكم في الحرم الجامعي',
    },
    ml: {
      'Fee Reminder': 'ഫീസ് ഓർമ്മപ്പെടുത്തൽ',
      'Important Update': 'പ്രധാനപ്പെട്ട അറിയിപ്പ്',
      'Attendance Alert': 'ഹാജർ മുന്നറിയിപ്പ്',
      'Midterm exams commence next week': 'അടുത്ത ആഴ്ച മിഡ്‌ടേം പരീക്ഷകൾ ആരംഭിക്കുന്നു',
      'Welcome to campus': 'ക്യാമ്പസിലേക്ക് സ്വാഗതം',
    },
    hi: {
      'Fee Reminder': 'शुल्क अनुस्मारक',
      'Important Update': 'महत्वपूर्ण अपडेट',
      'Attendance Alert': 'उपस्थिति चेतावनी',
      'Midterm exams commence next week': 'मध्यावधि परीक्षाएं अगले सप्ताह शुरू होंगी',
      'Welcome to campus': 'परिसर में आपका स्वागत है',
    },
    fr: {
      'Fee Reminder': 'Rappel de frais de scolarité',
      'Important Update': 'Mise à jour importante',
      'Attendance Alert': 'Alerte de présence',
      'Midterm exams commence next week': 'Les examens partiels commencent la semaine prochaine',
      'Welcome to campus': 'Bienvenue sur le campus',
    },
  };

  private constructor() {
    this.cache = TranslationCache.getInstance();
  }

  public static getInstance(): TranslationEngine {
    if (!TranslationEngine.instance) {
      TranslationEngine.instance = new TranslationEngine();
    }
    return TranslationEngine.instance;
  }

  public isRtlLanguage(lang: string): boolean {
    const rtlLangs = ['ar', 'ur', 'fa', 'he'];
    return rtlLangs.includes(lang.toLowerCase());
  }

  public async translate(
    text: string,
    targetLang: string,
    sourceLang = 'en',
    institutionId = 'global'
  ): Promise<TranslationResult> {
    if (!text || targetLang.toLowerCase() === sourceLang.toLowerCase()) {
      return {
        translatedText: text,
        sourceLang,
        targetLang,
        fromCache: false,
        isRtl: this.isRtlLanguage(targetLang),
      };
    }

    const hash = this.cache.computeHash(sourceLang, targetLang, text);
    const cached = await this.cache.get(hash, institutionId);

    if (cached) {
      return {
        translatedText: cached,
        sourceLang,
        targetLang,
        fromCache: true,
        isRtl: this.isRtlLanguage(targetLang),
      };
    }

    // Mask template placeholders e.g. {{student.name}} so translation does not alter them
    const placeholders: string[] = [];
    const maskedText = text.replace(/\{\{[\w.]+\}\}/g, (match) => {
      placeholders.push(match);
      return `__PLCHLD_${placeholders.length - 1}__`;
    });

    // Check mock/lexicon dictionary or apply translation mapping
    let translated = maskedText;
    const langDict = this.mockDictionary[targetLang.toLowerCase()];

    if (langDict) {
      for (const [key, val] of Object.entries(langDict)) {
        if (translated.includes(key)) {
          translated = translated.replace(new RegExp(key, 'g'), val);
        }
      }
    } else {
      // Default localized prefix for unsupported mock translation languages
      translated = `[${targetLang.toUpperCase()}] ${maskedText}`;
    }

    // Restore template placeholders
    placeholders.forEach((ph, idx) => {
      translated = translated.replace(`__PLCHLD_${idx}__`, ph);
    });

    // Save to cache
    await this.cache.set(hash, sourceLang, targetLang, text, translated, institutionId);

    return {
      translatedText: translated,
      sourceLang,
      targetLang,
      fromCache: false,
      isRtl: this.isRtlLanguage(targetLang),
    };
  }
}
