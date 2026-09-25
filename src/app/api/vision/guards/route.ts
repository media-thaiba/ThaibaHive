import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { VisionDbStore } from '@/lib/db/vision-store';
import { GuardDispatchRouter } from '@/lib/operations/vision/spatial/guard-dispatch-router';
import { guardProfileCreateSchema } from '@/lib/validation/vision-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const status = searchParams.get('status') || undefined;

  const store = VisionDbStore.getInstance();
  const guards = await store.listGuardProfiles(tenantId, status);
  return NextResponse.json({ guards });
}, 'vision:alerts:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const store = VisionDbStore.getInstance();
    const tenantId = user?.institutionId || 'global';

    if (body.action === 'dispatch_nearest') {
      const router = new GuardDispatchRouter(store);
      const decision = await router.findAndDispatchNearestGuard(
        body.incidentId,
        body.targetLocation,
        body.facilityId,
        tenantId
      );

      if (!decision) {
        return NextResponse.json({ error: 'No available on-duty guards found' }, { status: 404 });
      }

      return NextResponse.json({ dispatch: decision }, { status: 200 });
    }

    const parsed = guardProfileCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const guard = await store.createGuardProfile({
      ...parsed.data,
      lastHeartbeatAt: new Date().toISOString(),
      institutionId: tenantId,
    });

    return NextResponse.json({ guard }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'vision:guards:dispatch');
