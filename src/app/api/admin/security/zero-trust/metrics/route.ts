import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ZasmMetricsTracker } from '@/lib/security/zasm/zasm-metrics';

export const GET = withDPoP(
  requireAuth(async () => {
    const summary = ZasmMetricsTracker.getInstance().getSummary();
    return NextResponse.json({ summary });
  }, 'system:security:view'),
  { required: false }
);
