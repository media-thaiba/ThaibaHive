import { INSTITUTIONAL_INTENTS, IntentDefinition } from './intent-catalog';

export interface IntentMatchResult {
  intent: string;
  confidence: number;
  category: string;
  candidateIntents: Array<{ intent: string; score: number }>;
}

export class IntentClassifier {
  private static instance: IntentClassifier;
  private intents: IntentDefinition[];

  private constructor() {
    this.intents = INSTITUTIONAL_INTENTS;
  }

  public static getInstance(): IntentClassifier {
    if (!IntentClassifier.instance) {
      IntentClassifier.instance = new IntentClassifier();
    }
    return IntentClassifier.instance;
  }

  public classify(text: string): IntentMatchResult {
    if (!text || text.trim().length === 0) {
      return {
        intent: 'general_faq',
        confidence: 0.1,
        category: 'support',
        candidateIntents: [],
      };
    }

    const clean = text.toLowerCase();
    const candidateScores: Array<{ intent: string; score: number; category: string }> = [];

    for (const def of this.intents) {
      let matchedCount = 0;
      for (const kw of def.keywords) {
        if (clean.includes(kw.toLowerCase())) {
          matchedCount++;
        }
      }

      if (matchedCount > 0) {
        const score = Math.min(1.0, parseFloat((0.55 + matchedCount * 0.2).toFixed(2)));
        candidateScores.push({
          intent: def.intentId,
          score,
          category: def.category,
        });
      }
    }

    candidateScores.sort((a, b) => b.score - a.score);

    if (candidateScores.length === 0) {
      return {
        intent: 'general_faq',
        confidence: 0.35,
        category: 'support',
        candidateIntents: [],
      };
    }

    const top = candidateScores[0];
    return {
      intent: top.intent,
      confidence: top.score,
      category: top.category,
      candidateIntents: candidateScores.map((c) => ({ intent: c.intent, score: c.score })),
    };
  }
}
