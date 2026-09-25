import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { facilityStore } from '@/lib/db/facility-store';
import { sensorRegisterSchema } from '@/lib/validation/facility-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const equipmentId = searchParams.get('equipmentId');

  if (!equipmentId) {
    return NextResponse.json({ error: 'Missing required query parameter: equipmentId' }, { status: 400 });
  }

  const sensors = await facilityStore.listSensorsForEquipment(equipmentId, tenantId);
  return NextResponse.json({ sensors });
}, 'facility:equipment:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = sensorRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid sensor payload' }, { status: 400 });
    }

    const tenantId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const sensor = await facilityStore.registerSensor({
      ...parsed.data,
      institutionId: tenantId,
    });

    return NextResponse.json({ sensor }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'facility:equipment:manage');
