import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { TariffArbitrageOptimizer } from '@/lib/operations/eco/ml/tariff-arbitrage-optimizer';
import { microgridOptimizeSchema } from '@/lib/validation/eco-schemas';

export const dynamic = 'force-dynamic';

export const POST = requireAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const parsed = microgridOptimizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const optimization = TariffArbitrageOptimizer.optimize(parsed.data);
    return NextResponse.json({ optimization }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'eco:microgrid:control');
