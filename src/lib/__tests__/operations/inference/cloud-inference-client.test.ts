import { CloudInferenceClient } from '@/lib/operations/inference/cloud-inference-client';
import { TieredFallbackEngine } from '@/lib/operations/inference/tiered-fallback-engine';
import { EdgeInferenceEngine } from '@/lib/operations/inference/edge-inference-engine';
import { InferenceCache } from '@/lib/operations/inference/inference-cache';

describe('TD-044-03 Resolution: Production Cloud Inference Client & Tiered Fallback Suite', () => {
  const modelConfig = {
    modelId: 'm_retention_cloud_test',
    version: '1.0.0',
    quantizationFormat: 'FP32' as const,
    inputDim: 3,
    outputDim: 1,
    weights: [0.01, 0.01, 0.01],
    biases: [0.0],
  };

  it('should generate valid HMAC signature for cloud requests', () => {
    const client = new CloudInferenceClient({ apiKey: 'secret_test_key', mockTransport: true });
    const sig = client.generateSignature(JSON.stringify({ test: 123 }), 1700000000);

    expect(sig).toBeDefined();
    expect(typeof sig).toBe('string');
    expect(sig.length).toBe(64); // SHA-256 hex string
  });

  it('should invoke real HTTP fetch when endpoint is configured', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        predictionId: 'pred_cloud_http_1',
        probabilities: [0.05, 0.95],
        predictedClass: 1,
        confidenceScore: 0.95,
      }),
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;

    try {
      const client = new CloudInferenceClient({
        endpointUrl: 'https://api.models.thaiba.edu/v1/inference',
        apiKey: 'test_token_123',
        mockTransport: false,
      });

      const res = await client.invokeCloudInference('m_test', [0.1, 0.2, 0.3]);
      expect(res.predictionId).toBe('pred_cloud_http_1');
      expect(res.confidenceScore).toBe(0.95);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][1].headers['Authorization']).toBe('Bearer test_token_123');
      expect(mockFetch.mock.calls[0][1].headers['X-Inference-Signature']).toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should route low-confidence edge prediction to CloudInferenceClient with DP noise', async () => {
    const edgeEngine = new EdgeInferenceEngine();
    edgeEngine.loadModel(modelConfig);
    const cache = new InferenceCache();

    // High threshold (0.95) forces cloud fallback
    const tiered = new TieredFallbackEngine(edgeEngine, cache, 0.95);

    const input = [0.1, 0.2, 0.3];
    const result = await tiered.executeTieredPrediction('m_retention_cloud_test', input);

    expect(result.executedOn).toBe('CLOUD_FALLBACK');
    expect(result.confidenceScore).toBeGreaterThan(0.7);
    expect(result.predictionId).toContain('cloud_inf_');
  });
});
