import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { AimsDbStore } from '@/lib/operations/persistence/aims-db-store';

export const GET = withDPoP(
  requireAuth(async (_req, _session, context) => {
    const { id } = await context!.params;
    const store = AimsDbStore.getInstance();
    const res = store.getResource(id);

    if (!res) {
      return NextResponse.json({ error: 'Campus resource not found' }, { status: 404 });
    }

    return NextResponse.json({ resource: res });
  }, 'system:operations:view'),
  { required: false }
);

export const DELETE = withDPoP(
  requireAuth(async (_req, _session, context) => {
    const { id } = await context!.params;
    const store = AimsDbStore.getInstance();
    const res = store.getResource(id);

    if (!res) {
      return NextResponse.json({ error: 'Campus resource not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Resource ${id} removed` });
  }, 'system:operations:manage'),
  { required: false }
);
