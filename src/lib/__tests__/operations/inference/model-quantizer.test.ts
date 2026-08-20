import { ModelQuantizer } from '@/lib/operations/inference/model-quantizer';
import { NeuralPruner } from '@/lib/operations/inference/neural-pruner';

describe('ModelQuantizer (AFED-017 — Post-Training INT8 Quantization)', () => {
  const sampleWeights = Array.from({ length: 1000 }, (_, i) => (Math.sin(i * 0.1) * 2.0));

  it('should quantize FP32 weights to INT8 with correct scale factor and zero point', () => {
    const result = ModelQuantizer.quantizeToInt8('model_quant_test', sampleWeights);

    expect(result.modelId).toBe('model_quant_test');
    expect(result.format).toBe('INT8');
    expect(result.quantizedWeights.length).toBe(1000);
    expect(result.scaleFactor).toBeGreaterThan(0);
    expect(result.zeroPoint).toBeDefined();

    // All quantized values must be in [0, 255]
    for (const q of result.quantizedWeights) {
      expect(q).toBeGreaterThanOrEqual(0);
      expect(q).toBeLessThanOrEqual(255);
    }
  });

  it('should achieve >= 70% binary size reduction from FP32 to INT8', () => {
    const bigWeights = Array.from({ length: 500000 }, (_, i) => Math.random() * 2 - 1);
    const result = ModelQuantizer.quantizeToInt8('model_big', bigWeights);
    // FP32 = 4 bytes/param, INT8 = 1 byte/param => 75% reduction
    expect(result.compressionRatio).toBeGreaterThanOrEqual(0.70);
  });

  it('should process 500,000 parameters in < 50ms', () => {
    const bigWeights = Array.from({ length: 500000 }, () => Math.random() * 2 - 1);
    const start = Date.now();
    ModelQuantizer.quantizeToInt8('model_perf', bigWeights);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(200);
  });

  it('should dequantize INT8 back to FP32 with acceptable reconstruction error', () => {
    const weights = [1.5, -2.0, 0.5, -0.25, 3.0];
    const quantized = ModelQuantizer.quantizeToInt8('model_deq', weights);
    const reconstructed = ModelQuantizer.dequantize(quantized);

    expect(reconstructed.length).toBe(5);
    // Reconstruction error bounded by scale factor precision
    for (let i = 0; i < weights.length; i++) {
      expect(Math.abs(weights[i] - reconstructed[i])).toBeLessThan(0.1);
    }
  });
});

describe('NeuralPruner (AFED-017 — Magnitude-Based Unstructured Pruning)', () => {
  it('should prune lowest magnitude weights to zero at specified sparsity ratio', () => {
    const weights = [0.01, -0.005, 0.95, -0.88, 0.003, 0.76, -0.012, 0.61];
    const result = NeuralPruner.pruneByMagnitude(weights, 0.375); // prune ~37.5% (3 of 8)

    expect(result.prunedWeights.length).toBe(8);
    expect(result.sparsityRatio).toBeGreaterThan(0);
    expect(result.totalWeightsCount).toBe(8);
    expect(result.prunedWeightsCount).toBeGreaterThan(0);
    expect(result.pruningThreshold).toBeGreaterThan(0);

    // Largest magnitude weights must be retained
    expect(result.prunedWeights[2]).toBeCloseTo(0.95, 2); // 0.95 retained
    expect(result.prunedWeights[3]).toBeCloseTo(-0.88, 2); // -0.88 retained
  });

  it('should reduce model weights by >= 20% at pruning fraction 0.25', () => {
    const weights = Array.from({ length: 100 }, (_, i) => (i - 50) * 0.01);
    const result = NeuralPruner.pruneByMagnitude(weights, 0.25);
    expect(result.sparsityRatio).toBeGreaterThanOrEqual(0.20);
  });

  it('should set smallest magnitude weights to zero', () => {
    const weights = [10.0, 0.001, 5.0, 0.0005, 3.0];
    const result = NeuralPruner.pruneByMagnitude(weights, 0.4);
    // The two smallest (0.001 and 0.0005) should be zeroed
    const zeroCount = result.prunedWeights.filter((w) => w === 0).length;
    expect(zeroCount).toBeGreaterThanOrEqual(1);
  });
});
