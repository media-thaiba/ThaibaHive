import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { CarbonAccountingEngine } from '@/lib/operations/eco/carbon/carbon-accounting-engine';
import { carbonCalculateSchema } from '@/lib/validation/eco-schemas';

export const dynamic = 'force-dynamic';

export const POST = requireAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const parsed = carbonCalculateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid carbon calculation payload' }, { status: 400 });
    }

    const engine = new CarbonAccountingEngine();
    const result = engine.calculateBatchEmissions(
      parsed.data.inputs,
      parsed.data.retiredOffsetsKg,
      parsed.data.region
    );

    return NextResponse.json({ result }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'eco:carbon:view');
