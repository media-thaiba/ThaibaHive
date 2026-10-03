import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mdmEnrolledDevices } from '@/db/schema';
import { requireAuth } from '@/lib/api/auth-guard';
import { eq } from 'drizzle-orm';

export const GET = requireAuth(async (request: Request, _session) => {
  try {
    const url = new URL(request.url);
    const deviceUuid = url.searchParams.get('deviceUuid');

    if (!deviceUuid) {
      return NextResponse.json({ error: 'deviceUuid is required' }, { status: 400 });
    }

    const [device] = await db.select().from(mdmEnrolledDevices).where(eq(mdmEnrolledDevices.deviceUuid, deviceUuid));

    if (!device || device.status !== 'ACTIVE') {
      return NextResponse.json({ isEnrolled: false, error: 'Device not enrolled or revoked' }, { status: 403 });
    }

    return NextResponse.json({
      isEnrolled: true,
      tenantId: device.tenantId,
      status: device.status,
      enrolledAt: device.enrolledAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}, "sync:device");
