import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { ScheduleSyncEngine } from '@/lib/operations/docgen/mobile/schedule-sync-engine';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const lastSyncTimestamp = url.searchParams.get('lastSyncTimestamp') || undefined;

  const syncEngine = ScheduleSyncEngine.getInstance();
  const payload = await syncEngine.computeScheduleDelta(institutionId, lastSyncTimestamp);

  return NextResponse.json({ success: true, sync: payload });
}, 'mobile:sync');
