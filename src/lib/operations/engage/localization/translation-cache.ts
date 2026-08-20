import { createHash } from 'crypto';
import { EngageDbStore } from '../../../db/engage-store';

export class TranslationCache {
  private static instance: TranslationCache;
  private store: EngageDbStore;

  private constructor() {
    this.store = EngageDbStore.getInstance();
  }

  public static getInstance(): TranslationCache {
    if (!TranslationCache.instance) {
      TranslationCache.instance = new TranslationCache();
    }
    return TranslationCache.instance;
  }

  public computeHash(sourceLang: string, targetLang: string, text: string): string {
    return createHash('sha256').update(`${sourceLang}:${targetLang}:${text.trim()}`).digest('hex');
  }

  public async get(contentHash: string, institutionId = 'global'): Promise<string | null> {
    const record = await this.store.getTranslationAsync(contentHash, institutionId);
    return record ? record.translatedText : null;
  }

  public async set(
    contentHash: string,
    sourceLanguage: string,
    targetLanguage: string,
    sourceText: string,
    translatedText: string,
    institutionId = 'global'
  ): Promise<void> {
    await this.store.saveTranslationAsync({
      contentHash,
      sourceLanguage,
      targetLanguage,
      sourceText,
      translatedText,
      institutionId,
    });
  }
}
