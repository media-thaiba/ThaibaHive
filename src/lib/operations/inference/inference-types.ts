/**
 * Edge Inference, Quantization & Caching Types (A-FED / EdgeMesh)
 */

export interface EdgeModelConfig {
  modelId: string;
  version: string;
  quantizationFormat: 'FP32' | 'FP16' | 'INT8';
  inputDim: number;
  outputDim: number;
  weights: number[];
  biases?: number[];
  scaleFactor?: number;
  zeroPoint?: number;
}

export interface InferenceResult {
  predictionId: string;
  modelId: string;
  probabilities: number[];
  predictedClass: number;
  confidenceScore: number; // 0.0 - 1.0
  latencyMs: number;
  servedFromCache: boolean;
  executedOn: 'EDGE_LOCAL' | 'CLOUD_FALLBACK';
  timestamp: string;
}

export interface QuantizedModelPayload {
  modelId: string;
  format: 'INT8' | 'FP16';
  quantizedWeights: number[];
  scaleFactor: number;
  zeroPoint: number;
  compressionRatio: number;
  originalSizeKb: number;
  quantizedSizeKb: number;
}
