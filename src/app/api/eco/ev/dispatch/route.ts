import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { V2GFleetDispatcher } from '@/lib/operations/eco/ev/v2g-fleet-dispatcher';
import { evFleetDispatchSchema } from '@/lib/validation/eco-schemas';

export const dynamic = 'force-dynamic';

export const POST = requireAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const parsed = evFleetDispatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid EV dispatch payload' }, { status: 400 });
    }

    const dispatch = V2GFleetDispatcher.dispatchFleet(
      parsed.data.vehicles as any,
      parsed.data.peakDeficitKw,
      parsed.data.tariffRatePerKwh
    );

    return NextResponse.json({ dispatch }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'eco:ev:manage');
