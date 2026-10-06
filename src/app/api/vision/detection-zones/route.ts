import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { VisionDbStore } from '@/lib/db/vision-store';
import { detectionZoneCreateSchema } from '@/lib/validation/vision-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId"));
  const cameraId = searchParams.get('cameraId') || undefined;

  const store = VisionDbStore.getInstance();
  const zones = await store.listDetectionZones(tenantId, cameraId);
  return NextResponse.json({ zones });
}, 'vision:alerts:view');

export const POST = requireAuth(async (req: Request, session: any) => {
  try {
    const body = await req.json();
    const parsed = detectionZoneCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const tenantId = await resolveRequestInstitution(session, parsed.data.institutionId);
    const store = VisionDbStore.getInstance();
    const zone = await store.createDetectionZone({
      ...parsed.data,
      institutionId: tenantId,
    });

    return NextResponse.json({ zone }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'vision:cameras:manage');
