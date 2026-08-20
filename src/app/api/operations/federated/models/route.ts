import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { afedModelRegisterSchema } from '@/lib/validation/schemas';
import { AfedDbStore } from '@/lib/operations/persistence/afed-db-store';
import { AfedAuditLogger } from '@/lib/operations/persistence/afed-audit-events';

const dbStore = AfedDbStore.getInstance();

export const GET = requireAuth(async (request: Request) => {
  try {
    const models = dbStore.getAllModels();
    return NextResponse.json({ success: true, models }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch models' },
      { status: 500 }
    );
  }
}, 'federated:read');

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = afedModelRegisterSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { modelId, name, domain, version, architecture, inputDimensions, outputDimensions, hyperparameters, initialWeights } = parse.data;

    dbStore.saveModel({
      modelId,
      name,
      domain,
      version,
      architecture,
      inputDimensions,
      outputDimensions,
      hyperparametersData: JSON.stringify(hyperparameters || {}),
      status: 'initialized',
      currentRound: 0,
    });

    await AfedAuditLogger.logEvent({
      eventType: 'afed.model.registered',
      modelId,
      details: { name, domain, architecture },
    });

    return NextResponse.json({ success: true, modelId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to register model' },
      { status: 500 }
    );
  }
}, 'federated:manage');
