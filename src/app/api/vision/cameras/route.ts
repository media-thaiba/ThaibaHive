import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { VisionDbStore } from '@/lib/db/vision-store';
import { cameraCreateSchema } from '@/lib/validation/vision-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("institutionId") || searchParams.get("tenantId"));
  const facilityId = searchParams.get('facilityId') || undefined;
  const status = searchParams.get('status') || undefined;

  const store = VisionDbStore.getInstance();
  const cameras = await store.listCameras(tenantId, facilityId, status);
  return NextResponse.json({ cameras });
}, 'vision:alerts:view');

export const POST = requireAuth(async (req: Request, session: any) => {
  try {
    const body = await req.json();
    const parsed = cameraCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const tenantId = await resolveRequestInstitution(session, parsed.data.institutionId);
    const store = VisionDbStore.getInstance();
    const camera = await store.createCamera({
      ...parsed.data,
      institutionId: tenantId,
    });

    return NextResponse.json({ camera }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'vision:cameras:manage');
