/**
 * SOAR Approvals List API Route
 * Sprint-040 — Administration API
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { approvalQueue } from '@/lib/security/soar/approval-queue';

export const GET = withDPoP(
  requireAuth(async () => {
    const pending = approvalQueue.getPendingApprovals();
    return NextResponse.json({
      approvals: pending,
      total_pending: pending.length,
      timestamp: new Date().toISOString(),
    });
  }, 'system:security:view'),
  { required: false }
);
