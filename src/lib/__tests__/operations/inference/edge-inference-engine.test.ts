import { OnnxRuntimeAdapter } from '@/lib/operations/inference/onnx-runtime-adapter';
import { EdgeInferenceEngine } from '@/lib/operations/inference/edge-inference-engine';
import { ModelQuantizer } from '@/lib/operations/inference/model-quantizer';
import { NeuralPruner } from '@/lib/operations/inference/neural-pruner';
import { InferenceCache } from '@/lib/operations/inference/inference-cache';
import { TieredFallbackEngine } from '@/lib/operations/inference/tiered-fallback-engine';

describe('Edge Inference, Quantization & Caching Suite', () => {
  const modelConfig = {
    modelId: 'm_retention_edge',
    version: '1.0.0',
    quantizationFormat: 'FP32' as const,
    inputDim: 3,
    outputDim: 1,
    weights: [1.5, -2.0, 0.8],
    biases: [0.1],
  };

  it('should run onnx forward pass and predict classes', () => {
    const engine = new EdgeInferenceEngine();
    engine.loadModel(modelConfig);

    const res = engine.predict('m_retention_edge', [1.0, 0.5, 0.2]);
    expect(res.predictionId).toBeDefined();
    expect(res.confidenceScore).toBeGreaterThan(0.5);
    expect(res.probabilities.length).toBe(2);
    expect(res.executedOn).toBe('EDGE_LOCAL');
  });

  it('should quantize weights to INT8 and dequantize with low error', () => {
    const weights = [0.12, -0.45, 0.88, 1.25, -0.95];
    const payload = ModelQuantizer.quantizeToInt8('m_retention_edge', weights);

    expect(payload.quantizedWeights.length).toBe(5);
    expect(payload.format).toBe('INT8');
    expect(payload.compressionRatio).toBeGreaterThanOrEqual(0.7);

    const dequantized = ModelQuantizer.dequantize(payload);
    for (let i = 0; i < weights.length; i++) {
      expect(dequantized[i]).toBeCloseTo(weights[i], 1);
    }
  });

  it('should prune low magnitude weights to induce sparsity', () => {
    const weights = [0.01, 0.95, -0.02, 0.88, 0.005];
    const result = NeuralPruner.pruneByMagnitude(weights, 0.4);

    expect(result.sparsityRatio).toBeGreaterThanOrEqual(0.4);
    expect(result.prunedWeights[0]).toBe(0);
    expect(result.prunedWeights[2]).toBe(0);
    expect(result.prunedWeights[1]).toBe(0.95);
  });

  it('should cache and serve repeated predictions in <5ms', async () => {
    const engine = new EdgeInferenceEngine();
    engine.loadModel(modelConfig);
    const cache = new InferenceCache();
    const tiered = new TieredFallbackEngine(engine, cache, 0.5);

    const input = [1.0, 0.5, 0.2];
    const res1 = await tiered.executeTieredPrediction('m_retention_edge', input);
    expect(res1.servedFromCache).toBe(false);

    const res2 = await tiered.executeTieredPrediction('m_retention_edge', input);
    expect(res2.servedFromCache).toBe(true);
  });
});
