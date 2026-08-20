import { TranslationEngine } from '@/lib/operations/engage/localization/translation-engine';

describe('TranslationEngine Live Integration (TD-046-01)', () => {
  const engine = TranslationEngine.getInstance();

  it('should translate and cache results across multiple queries', async () => {
    const firstCall = await engine.translate('Fee Reminder', 'ar', 'en', 'inst_test');
    expect(firstCall.translatedText).toBe('تذكير بالرسوم');
    expect(firstCall.isRtl).toBe(true);
    expect(firstCall.fromCache).toBe(false);

    const secondCall = await engine.translate('Fee Reminder', 'ar', 'en', 'inst_test');
    expect(secondCall.translatedText).toBe('تذكير بالرسوم');
    expect(secondCall.fromCache).toBe(true);
  });

  it('should preserve template placeholders during translation', async () => {
    const res = await engine.translate('Welcome to campus {{student.name}}', 'ar', 'en', 'inst_test');
    expect(res.translatedText).toContain('{{student.name}}');
  });
});
