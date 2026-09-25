import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { alumniStore } from '@/db/alumni-store';
import { privacyConsentManager, ViewerRole } from '@/lib/operations/alumni/privacy-consent-manager';

export const GET = requireAuth(async (request, session) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const batchYear = url.searchParams.get('batchYear') ? Number(url.searchParams.get('batchYear')) : undefined;
  const department = url.searchParams.get('department') || undefined;
  const industry = url.searchParams.get('industry') || undefined;
  const isMentor = url.searchParams.get('isMentor') ? url.searchParams.get('isMentor') === 'true' : undefined;
  const isHiring = url.searchParams.get('isHiring') ? url.searchParams.get('isHiring') === 'true' : undefined;
  const search = url.searchParams.get('search') || undefined;

  const { items, total } = await alumniStore.listAlumniProfiles({
    institutionId,
    batchYear,
    department,
    industry,
    isMentor,
    isHiring,
    search,
  });

  const viewerRole: ViewerRole = (session?.role as any) || 'student';
  const viewerId = session?.staffId;

  const sanitizedItems = items.map((p) => privacyConsentManager.sanitizeProfile(p, viewerRole, viewerId));

  return NextResponse.json({ success: true, items: sanitizedItems, total });
}, 'alumni:directory:view');
