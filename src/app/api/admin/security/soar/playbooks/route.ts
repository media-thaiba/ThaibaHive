/**
 * SOAR Playbooks List & Create API Route
 * Sprint-040 — Administration API
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { CANONICAL_SECURITY_PLAYBOOKS } from '@/lib/security/soar/playbooks/definitions';
import { PlaybookValidator } from '@/lib/security/soar/playbook-validator';
import { soarDbStore } from '@/lib/security/soar/soar-db-store';

export const GET = withDPoP(
  requireAuth(async () => {
    const dbPlaybooks = await soarDbStore.listPlaybooks();
    // If DB is empty, provide canonical playbooks
    const playbooks = dbPlaybooks.length > 0 ? dbPlaybooks : CANONICAL_SECURITY_PLAYBOOKS;
    return NextResponse.json({ playbooks });
  }, 'system:security:view'),
  { required: false }
);

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    try {
      const body = await req.json();
      const validation = PlaybookValidator.validate(body);
      if (!validation.valid) {
        return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
      }

      await soarDbStore.savePlaybook(body);
      return NextResponse.json({ success: true, playbook: body }, { status: 201 });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
  }, 'system:security:manage'),
  { required: false }
);
