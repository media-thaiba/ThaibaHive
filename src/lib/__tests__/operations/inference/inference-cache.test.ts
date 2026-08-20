import { InferenceCache } from '@/lib/operations/inference/inference-cache';
import { TieredFallbackEngine } from '@/lib/operations/inference/tiered-fallback-engine';
import { EdgeInferenceEngine } from '@/lib/operations/inference/edge-inference-engine';
import { InferenceResult } from '@/lib/operations/inference/inference-types';

describe('InferenceCache (AFED-018 — LRU Edge Prediction Cache)', () => {
  it('should return undefined on cache miss and store result on set', () => {
    const cache = new InferenceCache(100, 60000);
    const vector = [0.5, 0.8, 0.3];

    const miss = cache.get('model_1', vector);
    expect(miss).toBeUndefined();

    const result: InferenceResult = {
      predictionId: 'pred_001',
      modelId: 'model_1',
      probabilities: [0.7, 0.3],
      predictedClass: 1,
      confidenceScore: 0.7,
      latencyMs: 3,
      servedFromCache: false,
      executedOn: 'EDGE_LOCAL',
      timestamp: new Date().toISOString(),
    };

    cache.set('model_1', vector, result);
    const hit = cache.get('model_1', vector);
    expect(hit).toBeDefined();
    expect(hit?.servedFromCache).toBe(true);
    expect(hit?.predictedClass).toBe(1);
  });

  it('should evict oldest entry when maxEntries is exceeded (LRU eviction)', () => {
    const cache = new InferenceCache(2, 60000);

    const makeResult = (id: string): InferenceResult => ({
      predictionId: id,
      modelId: 'm',
      probabilities: [0.6, 0.4],
      predictedClass: 0,
      confidenceScore: 0.6,
      latencyMs: 2,
      servedFromCache: false,
      executedOn: 'EDGE_LOCAL',
      timestamp: new Date().toISOString(),
    });

    cache.set('m', [1.0], makeResult('r1'));
    cache.set('m', [2.0], makeResult('r2'));
    cache.set('m', [3.0], makeResult('r3')); // should evict [1.0]

    expect(cache.get('m', [1.0])).toBeUndefined(); // evicted
    expect(cache.get('m', [2.0])).toBeDefined();
    expect(cache.get('m', [3.0])).toBeDefined();
  });

  it('should expire cache entries after TTL', async () => {
    const cache = new InferenceCache(100, 10); // 10ms TTL
    const result: InferenceResult = {
      predictionId: 'pred_ttl',
      modelId: 'm',
      probabilities: [1.0],
      predictedClass: 0,
      confidenceScore: 0.9,
      latencyMs: 1,
      servedFromCache: false,
      executedOn: 'EDGE_LOCAL',
      timestamp: new Date().toISOString(),
    };
    cache.set('m', [0.5], result, 10);
    await new Promise((r) => setTimeout(r, 25));
    expect(cache.get('m', [0.5])).toBeUndefined();
  });

  it('should generate deterministic SHA-256 cache keys from model+vector', () => {
    const key1 = InferenceCache.hashInput('model_1', [0.5, 0.8]);
    const key2 = InferenceCache.hashInput('model_1', [0.5, 0.8]);
    const key3 = InferenceCache.hashInput('model_2', [0.5, 0.8]);

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1.length).toBe(24);
  });
});

describe('TieredFallbackEngine (AFED-018 — Cloud Confidence Fallback Routing)', () => {
  let engine: TieredFallbackEngine;

  beforeEach(() => {
    const edgeEngine = new EdgeInferenceEngine();
    edgeEngine.loadModel({
      modelId: 'model_edge',
      version: '1.0.0',
      quantizationFormat: 'FP32',
      inputDim: 3,
      outputDim: 2,
      weights: [0.8, -0.5, 0.3],
      biases: [0.1],
    });
    const cache = new InferenceCache(100, 60000);
    engine = new TieredFallbackEngine(edgeEngine, cache, 0.65);
  });

  it('should serve cached results on repeated requests', async () => {
    const vector = [0.9, 0.1, 0.5];
    await engine.executeTieredPrediction('model_edge', vector); // first: edge
    const second = await engine.executeTieredPrediction('model_edge', vector); // second: cache
    expect(second.servedFromCache).toBe(true);
  });

  it('should route to cloud fallback when edge confidence is below threshold', async () => {
    const lowConfidenceEngine = new TieredFallbackEngine(
      (() => {
        const e = new EdgeInferenceEngine();
        e.loadModel({
          modelId: 'low_conf_model',
          version: '1.0.0',
          quantizationFormat: 'FP32',
          inputDim: 3,
          outputDim: 2,
          weights: [0.01, 0.01, 0.01],
          biases: [0.0],
        });
        return e;
      })(),
      new InferenceCache(100, 60000),
      0.99 // very high threshold to force fallback
    );

    const result = await lowConfidenceEngine.executeTieredPrediction('low_conf_model', [0.5, 0.5, 0.5]);
    expect(result.predictedClass).toBeDefined();
    expect(result.executedOn).toBe('CLOUD_FALLBACK');
  });
});
