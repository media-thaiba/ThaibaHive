import { EdgeModelConfig, InferenceResult } from './inference-types';
import { OnnxRuntimeAdapter } from './onnx-runtime-adapter';
import * as crypto from 'crypto';

/**
 * Edge-Native Model Inference Engine
 */
export class EdgeInferenceEngine {
  private loadedModels: Map<string, EdgeModelConfig> = new Map();

  public loadModel(config: EdgeModelConfig): void {
    this.loadedModels.set(config.modelId, config);
  }

  public predict(modelId: string, inputVector: number[]): InferenceResult {
    const startTime = Date.now();
    const model = this.loadedModels.get(modelId);
    if (!model) {
      throw new Error(`Model not loaded on edge runtime: ${modelId}`);
    }

    const { probabilities, predictedClass, confidenceScore } = OnnxRuntimeAdapter.runForward(model, inputVector);
    const latencyMs = Date.now() - startTime;

    return {
      predictionId: `pred_${crypto.randomUUID().slice(0, 8)}`,
      modelId,
      probabilities,
      predictedClass,
      confidenceScore,
      latencyMs,
      servedFromCache: false,
      executedOn: 'EDGE_LOCAL',
      timestamp: new Date().toISOString(),
    };
  }

  public getLoadedModel(modelId: string): EdgeModelConfig | undefined {
    return this.loadedModels.get(modelId);
  }

  public clear(): void {
    this.loadedModels.clear();
  }
}
