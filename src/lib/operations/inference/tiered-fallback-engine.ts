import { EdgeInferenceEngine } from './edge-inference-engine';
import { InferenceCache } from './inference-cache';
import { InferenceResult } from './inference-types';
import { DifferentialPrivacyEngine } from '../privacy/differential-privacy-engine';

/**
 * Tiered Fallback Engine coordinating Edge Local Inference, LRU Cache, and Cloud Ensemble Fallback
 */
export class TieredFallbackEngine {
  private edgeEngine: EdgeInferenceEngine;
  private cache: InferenceCache;
  private minConfidenceThreshold: number;

  constructor(
    edgeEngine: EdgeInferenceEngine,
    cache: InferenceCache,
    minConfidenceThreshold: number = 0.65
  ) {
    this.edgeEngine = edgeEngine;
    this.cache = cache;
    this.minConfidenceThreshold = minConfidenceThreshold;
  }

  /**
   * Execute tiered prediction: Cache -> Edge Local -> Cloud Fallback
   */
  public async executeTieredPrediction(
    modelId: string,
    inputVector: number[]
  ): Promise<InferenceResult> {
    // 1. Check LRU Cache
    const cached = this.cache.get(modelId, inputVector);
    if (cached) return cached;

    // 2. Execute local edge forward pass
    const localResult = this.edgeEngine.predict(modelId, inputVector);

    // If confidence meets threshold, cache and return
    if (localResult.confidenceScore >= this.minConfidenceThreshold) {
      this.cache.set(modelId, inputVector, localResult);
      return localResult;
    }

    // 3. Fallback to Cloud Ensemble: add differential privacy noise to input before cloud transmission
    const dpProtectedInput = DifferentialPrivacyEngine.perturbVector(inputVector, {
      epsilon: 2.0,
      delta: 1e-5,
      sensitivity: 1.0,
      mechanism: 'gaussian',
    });

    // Cloud ensemble mock forward computation with higher calibration
    const cloudConfidence = Math.min(0.99, localResult.confidenceScore + 0.25);
    const cloudResult: InferenceResult = {
      predictionId: `cloud_${localResult.predictionId}`,
      modelId,
      probabilities: localResult.probabilities.map((p) => Number((p * 0.9 + 0.05).toFixed(4))),
      predictedClass: localResult.predictedClass,
      confidenceScore: Number(cloudConfidence.toFixed(4)),
      latencyMs: localResult.latencyMs + 45, // includes cloud network hop
      servedFromCache: false,
      executedOn: 'CLOUD_FALLBACK',
      timestamp: new Date().toISOString(),
    };

    this.cache.set(modelId, inputVector, cloudResult);
    return cloudResult;
  }
}
