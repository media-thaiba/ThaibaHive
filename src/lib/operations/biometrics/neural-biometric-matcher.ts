import { BiometricEmbedding, MatchResult } from './biometric-types';

/**
 * Edge-Native Neural Embedding Matcher
 * Performs sub-50ms normalized Cosine Similarity comparisons against local enrolled template caches.
 */
export class NeuralBiometricMatcher {
  private templates: Map<string, BiometricEmbedding> = new Map();
  private similarityThreshold = 0.78; // Cosine similarity threshold for 512d FaceNet/MobileNet

  public registerTemplate(template: BiometricEmbedding): void {
    this.templates.set(template.templateId, template);
  }

  /**
   * Computes normalized cosine similarity: (u . v) / (||u|| * ||v||)
   */
  public computeCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) {
      return 0.0;
    }

    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0.0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Matches an incoming query embedding against all local enrolled templates
   */
  public matchEmbedding(queryVector: number[]): MatchResult {
    const startTime = Date.now();

    let bestMatchUserId: string | undefined;
    let bestSimilarity = 0.0;

    for (const template of this.templates.values()) {
      if (template.vector.length === queryVector.length) {
        const sim = this.computeCosineSimilarity(queryVector, template.vector);
        if (sim > bestSimilarity) {
          bestSimilarity = sim;
          bestMatchUserId = template.userId;
        }
      }
    }

    const duration = Date.now() - startTime;
    const isMatched = bestSimilarity >= this.similarityThreshold;

    return {
      matched: isMatched,
      userId: isMatched ? bestMatchUserId : undefined,
      similarityScore: Number(bestSimilarity.toFixed(4)),
      confidence: Number((Math.min(1.0, bestSimilarity / 0.95)).toFixed(3)),
      matchingDurationMs: duration,
    };
  }

  public getEnrolledCount(): number {
    return this.templates.size;
  }
}
