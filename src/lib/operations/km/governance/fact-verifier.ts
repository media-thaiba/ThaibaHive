import { DocumentChunk } from '../km-types';

export interface FactVerificationResult {
  isVerified: boolean;
  entailmentScore: number; // 0 to 1
  supportedClaims: string[];
  unsupportedClaims: string[];
  flaggedHallucinations: string[];
}

export class FactVerifier {
  /**
   * Evaluates entailment between generated answer claims and source reference chunks.
   */
  public verifyAnswerAgainstContext(
    generatedAnswer: string,
    sourceChunks: DocumentChunk[]
  ): FactVerificationResult {
    const combinedSourceText = sourceChunks.map((c) => c.content.toLowerCase()).join(' ');
    const sentences = generatedAnswer
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10 && !s.startsWith('#') && !s.startsWith('*'));

    const supportedClaims: string[] = [];
    const unsupportedClaims: string[] = [];
    const flaggedHallucinations: string[] = [];

    let matchedCount = 0;

    for (const sentence of sentences) {
      const words = sentence.toLowerCase().replace(/[^a-z0-9\-]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
      if (words.length === 0) continue;

      let wordMatchCount = 0;
      for (const word of words) {
        if (combinedSourceText.includes(word)) {
          wordMatchCount++;
        }
      }

      const matchRatio = wordMatchCount / words.length;

      const numericOrCodeTokens = sentence.match(/\b([A-Za-z]{2,5}-\d{3,4}|\d+)\b/g) || [];
      let hasUnfoundNumberOrCode = false;
      for (const tok of numericOrCodeTokens) {
        if (!combinedSourceText.includes(tok.toLowerCase())) {
          hasUnfoundNumberOrCode = true;
          break;
        }
      }

      if (hasUnfoundNumberOrCode) {
        flaggedHallucinations.push(sentence);
        unsupportedClaims.push(sentence);
      } else if (matchRatio >= 0.5) {
        supportedClaims.push(sentence);
        matchedCount++;
      } else {
        unsupportedClaims.push(sentence);
      }
    }

    const totalEvaluated = sentences.length || 1;
    const entailmentScore = Number((matchedCount / totalEvaluated).toFixed(2));
    const isVerified = entailmentScore >= 0.70 && flaggedHallucinations.length === 0;

    return {
      isVerified,
      entailmentScore,
      supportedClaims,
      unsupportedClaims,
      flaggedHallucinations,
    };
  }
}

export const factVerifier = new FactVerifier();
