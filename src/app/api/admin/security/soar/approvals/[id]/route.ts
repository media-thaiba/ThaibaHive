/**
 * SOAR Approval Resolution API Route
 * Sprint-040 — Administration API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ResolveApprovalRequestSchema } from '@/lib/validation/soar-schemas';
import { approvalQueue } from '@/lib/security/soar/approval-queue';
import { soarOrchestrator } from '@/lib/security/soar/orchestrator';
import { CANONICAL_SECURITY_PLAYBOOKS } from '@/lib/security/soar/playbooks/definitions';
import { soarDbStore } from '@/lib/security/soar/soar-db-store';
import { registerBuiltinActions } from '@/lib/security/soar/actions';

registerBuiltinActions();

export const POST = withDPoP(
  requireAuth(async (req: Request, user: any, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const resolvedParams = context?.params ? await context.params : (context as any)?.params;
      const id = resolvedParams?.id;
      if (!id) {
        return NextResponse.json({ error: 'Missing approval ID' }, { status: 400 });
      }

      const body = await req.json();
      const parsed = ResolveApprovalRequestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
      }

      const { decision, reason } = parsed.data;
      const resolvedBy = user?.userId || 'admin';

      const approval = approvalQueue.resolve(id, decision, resolvedBy, reason);
      if (!approval) {
        return NextResponse.json({ error: `Approval item '${id}' not found or already resolved` }, { status: 404 });
      }

      // If approved, trigger the playbook execution
      let executionResult = null;
      if (decision === 'APPROVED') {
        const dbPlaybook = await soarDbStore.getPlaybook(approval.playbook_id);
        const playbook = dbPlaybook || CANONICAL_SECURITY_PLAYBOOKS.find(p => p.id === approval.playbook_id);

        if (playbook) {
          executionResult = await soarOrchestrator.executePlaybook(
            playbook,
            approval.trigger_payload,
            approval.target_entity,
            { actorId: resolvedBy, approvalId: id }
          );
          soarDbStore.saveExecution(executionResult).catch(() => {});
        }
      }

      soarDbStore.saveApproval(approval).catch(() => {});

      return NextResponse.json({
        success: true,
        approval,
        execution: executionResult,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
  }, 'system:soar:approve'),
  { required: false }
);
