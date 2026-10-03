import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { ScheduleSyncEngine } from '@/lib/operations/docgen/mobile/schedule-sync-engine';

export const GET = requireAuth(async (request, session) => {
  const url = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, url.searchParams.get("institutionId"));
  const lastSyncTimestamp = url.searchParams.get('lastSyncTimestamp') || undefined;

  const syncEngine = ScheduleSyncEngine.getInstance();
  const payload = await syncEngine.computeScheduleDelta(institutionId, lastSyncTimestamp);

  return NextResponse.json({ success: true, sync: payload });
}, 'mobile:sync');
