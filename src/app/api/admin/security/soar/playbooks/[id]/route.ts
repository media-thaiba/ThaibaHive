/**
 * SOAR Single Playbook Management API Route
 * Sprint-040 — Administration API
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { CANONICAL_SECURITY_PLAYBOOKS } from '@/lib/security/soar/playbooks/definitions';
import { soarDbStore } from '@/lib/security/soar/soar-db-store';

export const GET = withDPoP(
  requireAuth(async (_req: Request, _user: any, context?: { params: Promise<Record<string, string>> }) => {
    const resolvedParams = context?.params ? await context.params : (context as any)?.params;
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing playbook ID' }, { status: 400 });
    }

    const dbPlaybook = await soarDbStore.getPlaybook(id);
    const playbook = dbPlaybook || CANONICAL_SECURITY_PLAYBOOKS.find(p => p.id === id);

    if (!playbook) {
      return NextResponse.json({ error: `Playbook '${id}' not found` }, { status: 404 });
    }

    return NextResponse.json({ playbook });
  }, 'system:security:view'),
  { required: false }
);

export const PATCH = withDPoP(
  requireAuth(async (req: Request, _user: any, context?: { params: Promise<Record<string, string>> }) => {
    const resolvedParams = context?.params ? await context.params : (context as any)?.params;
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing playbook ID' }, { status: 400 });
    }

    const dbPlaybook = await soarDbStore.getPlaybook(id);
    const existing = dbPlaybook || CANONICAL_SECURITY_PLAYBOOKS.find(p => p.id === id);

    if (!existing) {
      return NextResponse.json({ error: `Playbook '${id}' not found` }, { status: 404 });
    }

    const updates = await req.json();
    const updated = { ...existing, ...updates, id };

    await soarDbStore.savePlaybook(updated);
    return NextResponse.json({ success: true, playbook: updated });
  }, 'system:security:manage'),
  { required: false }
);
