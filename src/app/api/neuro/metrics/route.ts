import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { neuroMetrics } from '@/lib/operations/neuro/telemetry/neuro-metrics';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async () => {
  const metricsText = neuroMetrics.exportMetricsText();
  return new NextResponse(metricsText, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    },
  });
}, 'neuro:metrics:view');
