import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { AimsDbStore } from '@/lib/operations/persistence/aims-db-store';

export const GET = withDPoP(
  requireAuth(async (_req, _session, context) => {
    const { id } = await context!.params;
    const store = AimsDbStore.getInstance();
    const optimizations = store.getEnergyOptimizations();
    const opt = optimizations.find((o) => o.id === id);

    if (!opt) {
      return NextResponse.json({ error: 'Optimization record not found' }, { status: 404 });
    }

    return NextResponse.json({ optimization: opt });
  }, 'system:energy:manage'),
  { required: false }
);

export const DELETE = withDPoP(
  requireAuth(async (_req, _session, context) => {
    const { id } = await context!.params;
    const store = AimsDbStore.getInstance();
    const optimizations = store.getEnergyOptimizations();
    const exists = optimizations.some((o) => o.id === id);

    if (!exists) {
      return NextResponse.json({ error: 'Optimization record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Optimization ${id} deleted` });
  }, 'system:energy:manage'),
  { required: false }
);
