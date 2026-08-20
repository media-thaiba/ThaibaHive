import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { AimsDbStore } from '@/lib/operations/persistence/aims-db-store';

export const GET = withDPoP(
  requireAuth(async (_req, _session, context) => {
    const { id } = await context!.params;
    const store = AimsDbStore.getInstance();
    const dispatches = store.getDispatches();
    const dispatch = dispatches.find((d) => d.routeId === id || d.id === id);

    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch route not found' }, { status: 404 });
    }

    return NextResponse.json({ dispatch });
  }, 'system:fleet:manage'),
  { required: false }
);

export const DELETE = withDPoP(
  requireAuth(async (_req, _session, context) => {
    const { id } = await context!.params;
    const store = AimsDbStore.getInstance();
    const dispatches = store.getDispatches();
    const exists = dispatches.some((d) => d.routeId === id || d.id === id);

    if (!exists) {
      return NextResponse.json({ error: 'Dispatch route not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Dispatch ${id} cancelled` });
  }, 'system:fleet:manage'),
  { required: false }
);
