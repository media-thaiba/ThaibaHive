import { cloudTranslationAdapter } from '@/lib/operations/km/localization/cloud-translation-adapter';

describe('Cloud Translation Adapter (KM-013 / TD-046-01 Resolution)', () => {
  it('should translate phrases into Arabic with high quality score', async () => {
    const res = await cloudTranslationAdapter.translateCloud('Welcome to campus', 'ar', 'en');
    expect(res.translatedText).toBe('مرحبا بكم في الحرم الجامعي');
    expect(res.targetLanguage).toBe('ar');
    expect(res.qualityScore).toBeGreaterThanOrEqual(0.85);
  });

  it('should translate phrases into French', async () => {
    const res = await cloudTranslationAdapter.translateCloud('Welcome to campus', 'fr', 'en');
    expect(res.translatedText).toBe('Bienvenue sur le campus');
    expect(res.targetLanguage).toBe('fr');
  });

  it('should handle unmapped phrases gracefully with language tag', async () => {
    const res = await cloudTranslationAdapter.translateCloud('Custom institutional rule', 'es', 'en');
    expect(res.translatedText).toContain('Custom institutional rule');
    expect(res.qualityScore).toBeGreaterThan(0.8);
  });
});
