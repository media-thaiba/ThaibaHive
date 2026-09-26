/**
 * SOAR Metrics & Emergency Killswitch API Route
 * Sprint-040 — Administration API
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { soarMetricsTracker } from '@/lib/security/soar/soar-metrics';
import { soarOrchestrator } from '@/lib/security/soar/orchestrator';
import { approvalQueue } from '@/lib/security/soar/approval-queue';
import { soarMeshSync } from '@/lib/security/soar/soar-mesh-sync';

export const GET = withDPoP(
  requireAuth(async () => {
    const summary = soarMetricsTracker.getSummary();
    const pendingCount = approvalQueue.getPendingApprovals().length;

    return NextResponse.json({
      metrics: {
        ...summary,
        pendingApprovals: pendingCount,
        engineEnabled: soarOrchestrator.isEngineEnabled(),
      },
      timestamp: new Date().toISOString(),
    });
  }, 'system:security:view'),
  { required: false }
);

export const POST = withDPoP(
  requireAuth(async (req: Request, user: any) => {
    try {
      const body = await req.json();
      const enabled = !!body.enabled;

      soarOrchestrator.setEngineEnabled(enabled);

      soarMeshSync.publish(enabled ? 'KILLSWITCH_DEACTIVATED' : 'KILLSWITCH_ACTIVATED', {
        actor: user?.userId || 'admin',
        enabled,
      });

      return NextResponse.json({
        success: true,
        engineEnabled: enabled,
        message: enabled
          ? 'Autonomous security orchestration engine activated'
          : 'EMERGENCY KILLSWITCH ENGAGED: All autonomous SOAR actions paused',
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
  }, 'system:soar:emergency'),
  { required: false }
);
