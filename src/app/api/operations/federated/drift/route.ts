import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { StatisticalDriftDetector } from '@/lib/operations/drift/statistical-drift-detector';
import { z } from 'zod';

const evaluateDriftSchema = z.object({
  modelId: z.string(),
  featureName: z.string().default('gpa'),
  baselineDistribution: z.array(z.number()),
  currentDistribution: z.array(z.number()),
});

export const GET = requireAuth(async () => {
  try {
    return NextResponse.json({ reports: [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}, 'operations:read');

export const POST = requireAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const parsed = evaluateDriftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { featureName, baselineDistribution, currentDistribution } = parsed.data;

    const report = StatisticalDriftDetector.evaluateFeature(
      featureName,
      baselineDistribution,
      currentDistribution
    );

    return NextResponse.json({ report }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}, 'operations:write');
