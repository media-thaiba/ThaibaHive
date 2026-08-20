export interface SentimentVerificationResult {
  sentimentScore: number; // -1.0 (extremely negative) to +1.0 (extremely positive)
  sentimentLabel: 'positive' | 'neutral' | 'negative' | 'hostile';
  isSafeForDispatch: boolean;
  flaggedTerms: string[];
}

export class SentimentVerifier {
  private static instance: SentimentVerifier;

  private readonly positiveWords = ['congratulations', 'excellent', 'honor', 'welcome', 'pleased', 'great', 'successful', 'appreciate', 'thank you'];
  private readonly negativeWords = ['overdue', 'warning', 'deficit', 'penalty', 'missed', 'failing', 'absent', 'alert'];
  private readonly hostileWords = ['fraud', 'lawsuit', 'expelled', 'arrest', 'criminal', 'punishment', 'confiscate'];

  public static getInstance(): SentimentVerifier {
    if (!SentimentVerifier.instance) {
      SentimentVerifier.instance = new SentimentVerifier();
    }
    return SentimentVerifier.instance;
  }

  public analyze(text: string): SentimentVerificationResult {
    const clean = text.toLowerCase();
    const flaggedTerms: string[] = [];

    let score = 0;

    for (const w of this.positiveWords) {
      if (clean.includes(w)) score += 0.2;
    }

    for (const w of this.negativeWords) {
      if (clean.includes(w)) score -= 0.15;
    }

    for (const w of this.hostileWords) {
      if (clean.includes(w)) {
        score -= 0.5;
        flaggedTerms.push(w);
      }
    }

    score = Math.max(-1.0, Math.min(1.0, parseFloat(score.toFixed(2))));

    let sentimentLabel: 'positive' | 'neutral' | 'negative' | 'hostile' = 'neutral';
    if (score > 0.2) sentimentLabel = 'positive';
    else if (score < -0.4 || flaggedTerms.length > 0) sentimentLabel = 'hostile';
    else if (score < 0) sentimentLabel = 'negative';

    const isSafeForDispatch = flaggedTerms.length === 0;

    return {
      sentimentScore: score,
      sentimentLabel,
      isSafeForDispatch,
      flaggedTerms,
    };
  }
}
