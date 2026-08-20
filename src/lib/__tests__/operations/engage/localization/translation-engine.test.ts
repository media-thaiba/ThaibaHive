import { TranslationEngine } from '../../../../operations/engage/localization/translation-engine';
import { EngageDbStore } from '../../../../db/engage-store';

describe('EngageOS TranslationEngine & Localization Tests', () => {
  let engine: TranslationEngine;
  let store: EngageDbStore;

  beforeEach(() => {
    engine = TranslationEngine.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should translate institutional terms to Arabic and preserve variables', async () => {
    const text = 'Fee Reminder: {{student.name}}, your tuition fee is due.';
    const res = await engine.translate(text, 'ar', 'en', 'inst_test');

    expect(res.translatedText).toContain('تذكير بالرسوم');
    expect(res.translatedText).toContain('{{student.name}}');
    expect(res.isRtl).toBe(true);
    expect(res.fromCache).toBe(false);

    // Second call should come from cache
    const cachedRes = await engine.translate(text, 'ar', 'en', 'inst_test');
    expect(cachedRes.fromCache).toBe(true);
  });

  it('should translate to Malayalam correctly', async () => {
    const text = 'Attendance Alert: {{student.name}} has missed classes.';
    const res = await engine.translate(text, 'ml', 'en', 'inst_test');

    expect(res.translatedText).toContain('ഹാജർ മുന്നറിയിപ്പ്');
    expect(res.isRtl).toBe(false);
  });
});
