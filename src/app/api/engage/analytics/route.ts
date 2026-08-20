import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { EngagementAggregator } from '@/lib/operations/engage/analytics/engagement-aggregator';

const aggregator = EngagementAggregator.getInstance();

export const GET = requireAuth(async () => {
  try {
    const overview = await aggregator.getOverview('global');
    return NextResponse.json({ success: true, overview }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch engagement analytics' }, { status: 500 });
  }
}, 'engage:campaign:view');
