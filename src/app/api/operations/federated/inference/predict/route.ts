import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { afedInferencePredictSchema } from '@/lib/validation/schemas';
import { EdgeInferenceEngine } from '@/lib/operations/inference/edge-inference-engine';
import { InferenceCache } from '@/lib/operations/inference/inference-cache';
import { TieredFallbackEngine } from '@/lib/operations/inference/tiered-fallback-engine';
import { AfedMetricsTracker } from '@/lib/operations/persistence/afed-metrics';
import { AfedDbStore } from '@/lib/operations/persistence/afed-db-store';

const edgeEngine = new EdgeInferenceEngine();
const cache = new InferenceCache();
const tieredEngine = new TieredFallbackEngine(edgeEngine, cache, 0.65);
const metricsTracker = AfedMetricsTracker.getInstance();
const dbStore = AfedDbStore.getInstance();

// Load default edge model
edgeEngine.loadModel({
  modelId: 'm_retention',
  version: '1.0.0',
  quantizationFormat: 'FP32',
  inputDim: 5,
  outputDim: 1,
  weights: [1.8, 2.2, 1.2, 1.0, 1.5],
  biases: [-2.5],
});

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = afedInferencePredictSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { modelId, inputVector } = parse.data;
    const result = await tieredEngine.executeTieredPrediction(modelId, inputVector);

    metricsTracker.recordEdgeInferenceDuration(result.latencyMs / 1000.0);
    dbStore.savePrediction({
      predictionId: result.predictionId,
      modelId,
      predictedClass: result.predictedClass,
      confidenceScore: result.confidenceScore,
      executedOn: result.executedOn,
      latencyMs: result.latencyMs,
    });

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Inference prediction failed' },
      { status: 500 }
    );
  }
}, 'federated:read');
