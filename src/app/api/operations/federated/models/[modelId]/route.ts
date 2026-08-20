import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { AfedDbStore } from '@/lib/operations/persistence/afed-db-store';

const dbStore = AfedDbStore.getInstance();

export const GET = requireAuth(async (request: Request, context?: any) => {
  try {
    const params = context?.params ? await context.params : {};
    const modelId = params?.modelId;

    if (!modelId) {
      return NextResponse.json({ error: 'Model ID required' }, { status: 400 });
    }

    const model = dbStore.getModel(modelId);
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const rounds = dbStore.getTrainingRounds(modelId);

    return NextResponse.json({ success: true, model, rounds }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get model' },
      { status: 500 }
    );
  }
}, 'federated:read');
