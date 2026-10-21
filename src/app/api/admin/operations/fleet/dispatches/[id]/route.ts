import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { AimsDbStore } from '@/lib/operations/persistence/aims-db-store';

export const GET = withDPoP(
  requireAuth(async (req, _session, context) => {
    const params = context?.params ? await context.params : {};
    let id = params.id;
    if (!id) {
      const url = new URL(req.url);
      id = url.pathname.split("/").pop();
    }
    if (!id) {
      return NextResponse.json({ error: 'Dispatch route ID is required' }, { status: 400 });
    }

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
  requireAuth(async (req, _session, context) => {
    const params = context?.params ? await context.params : {};
    let id = params.id;
    if (!id) {
      const url = new URL(req.url);
      id = url.pathname.split("/").pop();
    }
    if (!id) {
      return NextResponse.json({ error: 'Dispatch route ID is required' }, { status: 400 });
    }

    const store = AimsDbStore.getInstance();
    const deleted = store.deleteDispatch(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Dispatch route not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Dispatch ${id} cancelled` });
  }, 'system:fleet:manage'),
  { required: false }
);
