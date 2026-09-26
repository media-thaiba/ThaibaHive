/**
 * SOAR Manual Execution Trigger API Route
 * Sprint-040 — Administration API
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ManualTriggerRequestSchema } from '@/lib/validation/soar-schemas';
import { CANONICAL_SECURITY_PLAYBOOKS } from '@/lib/security/soar/playbooks/definitions';
import { soarDbStore } from '@/lib/security/soar/soar-db-store';
import { soarOrchestrator } from '@/lib/security/soar/orchestrator';
import { registerBuiltinActions } from '@/lib/security/soar/actions';

// Ensure actions are registered
registerBuiltinActions();

export const POST = withDPoP(
  requireAuth(async (req: Request, user: any) => {
    try {
      const body = await req.json();
      const parsed = ManualTriggerRequestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
      }

      const { playbook_id, target_type, target_value, payload } = parsed.data;

      const dbPlaybook = await soarDbStore.getPlaybook(playbook_id);
      const playbook = dbPlaybook || CANONICAL_SECURITY_PLAYBOOKS.find(p => p.id === playbook_id);

      if (!playbook) {
        return NextResponse.json({ error: `Playbook '${playbook_id}' not found` }, { status: 404 });
      }

      const context = await soarOrchestrator.executePlaybook(
        playbook,
        payload,
        { type: target_type, value: target_value },
        { actorId: user?.userId || 'admin' }
      );

      // Async save to database
      soarDbStore.saveExecution(context).catch(() => {});

      return NextResponse.json({
        success: context.state === 'COMPLETED' || context.state === 'COMPENSATED',
        execution: context,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
  }, 'system:security:manage'),
  { required: false }
);
