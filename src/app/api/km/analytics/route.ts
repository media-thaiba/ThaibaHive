import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { kmAnalyticsAggregator } from '@/lib/operations/km/analytics/km-analytics-aggregator';

export const GET = requireAuth(async (_request: Request) => {
  try {
    const summary = kmAnalyticsAggregator.computeSummary('global');
    return NextResponse.json({ success: true, analytics: summary }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch analytics' }, { status: 500 });
  }
}, 'km:analytics:view');
