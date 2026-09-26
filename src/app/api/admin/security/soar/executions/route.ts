/**
 * SOAR Executions Query API Route
 * Sprint-040 — Administration API
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { soarOrchestrator } from '@/lib/security/soar/orchestrator';
import { soarDbStore } from '@/lib/security/soar/soar-db-store';

export const GET = withDPoP(
  requireAuth(async (req: Request) => {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') as any;
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const memoryExecutions = soarOrchestrator.getExecutionHistory(limit, status ? { status } : undefined);
    const activeExecutions = soarOrchestrator.getActiveExecutions();
    const dbExecutions = await soarDbStore.listExecutions(limit);

    return NextResponse.json({
      active: activeExecutions,
      history: memoryExecutions.length > 0 ? memoryExecutions : dbExecutions,
      total_active: activeExecutions.length,
      timestamp: new Date().toISOString(),
    });
  }, 'system:security:view'),
  { required: false }
);
