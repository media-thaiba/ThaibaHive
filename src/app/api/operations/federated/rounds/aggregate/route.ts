import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { afedRoundAggregateSchema } from '@/lib/validation/schemas';
import { FedAlgorithms } from '@/lib/operations/federated/fed-algorithms';
import { AfedDbStore } from '@/lib/operations/persistence/afed-db-store';
import { AfedMetricsTracker } from '@/lib/operations/persistence/afed-metrics';
import { AfedAuditLogger } from '@/lib/operations/persistence/afed-audit-events';

const dbStore = AfedDbStore.getInstance();
const metricsTracker = AfedMetricsTracker.getInstance();

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = afedRoundAggregateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { modelId, roundNumber = 1, clientUpdates, algorithm = 'FedAvg' } = parse.data;

    const formattedUpdates = clientUpdates.map((c) => ({
      nodeId: c.nodeId,
      modelId,
      roundNumber,
      weights: c.weights,
      sampleCount: c.sampleCount,
      localLoss: c.localLoss || 0.2,
      localAccuracy: c.localAccuracy || 0.9,
      trainingDurationMs: c.trainingDurationMs || 500,
      checksum: FedAlgorithms.computeChecksum(c.weights),
      timestamp: new Date().toISOString(),
    }));

    let aggregatedWeights: number[] = [];
    if (algorithm === 'FedProx') {
      const currentWeights = new Array(clientUpdates[0].weights.length).fill(0);
      aggregatedWeights = FedAlgorithms.aggregateFedProx(formattedUpdates, currentWeights, 0.01);
    } else {
      aggregatedWeights = FedAlgorithms.aggregateFedAvg(formattedUpdates);
    }

    const totalSamples = formattedUpdates.reduce((s, u) => s + u.sampleCount, 0);
    const avgLoss = formattedUpdates.reduce((s, u) => s + u.localLoss * u.sampleCount, 0) / totalSamples;
    const avgAcc = formattedUpdates.reduce((s, u) => s + u.localAccuracy * u.sampleCount, 0) / totalSamples;
    const roundId = `round_${modelId}_${roundNumber}_${Date.now()}`;

    dbStore.saveTrainingRound({
      roundId,
      modelId,
      roundNumber,
      participantsCount: formattedUpdates.length,
      totalSamples,
      aggregationAlgorithm: algorithm,
      globalLoss: Number(avgLoss.toFixed(4)),
      globalAccuracy: Number(avgAcc.toFixed(4)),
      status: 'completed',
    });

    metricsTracker.recordTrainingRound(modelId, algorithm);
    metricsTracker.setTrainingLoss(modelId, avgLoss);
    metricsTracker.setModelAccuracy(modelId, avgAcc);

    await AfedAuditLogger.logEvent({
      eventType: 'afed.round.completed',
      modelId,
      roundNumber,
      details: { participants: formattedUpdates.length, accuracy: avgAcc, loss: avgLoss },
    });

    return NextResponse.json({
      success: true,
      roundId,
      modelId,
      roundNumber,
      aggregatedWeights,
      checksum: FedAlgorithms.computeChecksum(aggregatedWeights),
      globalAccuracy: Number(avgAcc.toFixed(4)),
      globalLoss: Number(avgLoss.toFixed(4)),
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Round aggregation failed' },
      { status: 500 }
    );
  }
}, 'federated:train');
