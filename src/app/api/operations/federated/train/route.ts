import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { FederatedAggregationServer } from '@/lib/operations/federated/fed-aggregation-server';
import { z } from 'zod';

const trainRoundSchema = z.object({
  modelId: z.string(),
  roundNumber: z.number().int().positive(),
  algorithm: z.enum(['FedAvg', 'FedProx']).default('FedAvg'),
  clientUpdates: z.array(
    z.object({
      nodeId: z.string(),
      weights: z.array(z.number()),
      sampleCount: z.number().positive(),
      localLoss: z.number().optional(),
      localAccuracy: z.number().optional(),
    })
  ),
});

export const POST = requireAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const parsed = trainRoundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { modelId, roundNumber, algorithm, clientUpdates } = parsed.data;
    const server = new FederatedAggregationServer();

    const result = server.aggregateRound(
      modelId,
      clientUpdates.map((c) => ({
        nodeId: c.nodeId,
        campusId: 'campus_1',
        modelId,
        roundNumber,
        gradients: c.weights,
        sampleCount: c.sampleCount,
        localLoss: c.localLoss ?? 0.5,
        localAccuracy: c.localAccuracy ?? 0.85,
        dpEpsilonSpent: 1.0,
        checksum: 'chk_123',
        timestamp: new Date().toISOString(),
      })),
      { algorithm }
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}, 'operations:write');
