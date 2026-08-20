import { EdgeInferenceEngine } from './edge-inference-engine';
import { InferenceCache } from './inference-cache';
import { InferenceResult } from './inference-types';
import { DifferentialPrivacyEngine } from '../privacy/differential-privacy-engine';
import { CloudInferenceClient } from './cloud-inference-client';

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

    const cloudClient = CloudInferenceClient.getInstance();
    const cloudResult = await cloudClient.invokeCloudInference(modelId, dpProtectedInput, localResult);

    this.cache.set(modelId, inputVector, cloudResult);
    return cloudResult;
  }
}
