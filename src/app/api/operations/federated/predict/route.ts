import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { EdgeInferenceEngine } from '@/lib/operations/inference/edge-inference-engine';
import { z } from 'zod';

const predictSchema = z.object({
  modelId: z.string(),
  inputVector: z.array(z.number()),
});

export const POST = requireAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const parsed = predictSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { modelId, inputVector } = parsed.data;
    const engine = new EdgeInferenceEngine();

    const result = engine.predict(modelId, inputVector);

    return NextResponse.json({ result }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}, 'operations:read');
