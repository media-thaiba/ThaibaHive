import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { sensorCreateSchema } from '@/lib/validation/twin-schemas';
import { TwinDbStore } from '@/lib/db/twin-store';

const store = TwinDbStore.getInstance();

export const GET = requireAuth(async (request: Request, user: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
    const facilityId = searchParams.get('facilityId') || undefined;

    const sensors = await store.listSensors(tenantId, facilityId);
    return NextResponse.json({ success: true, sensors }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list sensors' }, { status: 500 });
  }
}, 'twin:facilities:read');

export const POST = requireAuth(async (request: Request, _user: any) => {
  try {
    const body = await request.json();
    const parse = sensorCreateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const sensor = await store.createSensor(parse.data);
    return NextResponse.json({ success: true, sensor }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to register sensor' }, { status: 500 });
  }
}, 'twin:iot:ingest');
