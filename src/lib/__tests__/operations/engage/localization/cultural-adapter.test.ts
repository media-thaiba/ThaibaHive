import { CulturalAdapter } from '../../../../operations/engage/localization/cultural-adapter';
import { SentimentVerifier } from '../../../../operations/engage/localization/sentiment-verifier';

describe('EngageOS CulturalAdapter & SentimentVerifier Tests', () => {
  let culturalAdapter: CulturalAdapter;
  let sentimentVerifier: SentimentVerifier;

  beforeEach(() => {
    culturalAdapter = CulturalAdapter.getInstance();
    sentimentVerifier = SentimentVerifier.getInstance();
  });

  it('should generate locale-appropriate cultural salutations', () => {
    const arSalutation = culturalAdapter.getSalutation('Ahmed', {
      locale: 'ar-SA',
      relationship: 'parent',
    });
    expect(arSalutation).toContain('السلام عليكم');
    expect(arSalutation).toContain('ولي أمر الطالب Ahmed');

    const enSalutation = culturalAdapter.getSalutation('David', {
      locale: 'en-US',
      relationship: 'parent',
    });
    expect(enSalutation).toBe('Dear Esteemed Parent of David,');
  });

  it('should score positive vs hostile text in sentiment verifier', () => {
    const pos = sentimentVerifier.analyze('Congratulations on your excellent exam performance and welcome to the honors list!');
    expect(pos.sentimentLabel).toBe('positive');
    expect(pos.isSafeForDispatch).toBe(true);

    const hostile = sentimentVerifier.analyze('You are suspected of criminal fraud and will be punished!');
    expect(hostile.sentimentLabel).toBe('hostile');
    expect(hostile.isSafeForDispatch).toBe(false);
    expect(hostile.flaggedTerms).toContain('criminal');
  });
});
