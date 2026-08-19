import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mdmEnrolledDevices } from '@/db/schema';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceUuid, deviceModel, osVersion, tenantId, enrollmentToken } = body;

    if (!deviceUuid || !tenantId || !enrollmentToken) {
      return NextResponse.json({ error: 'deviceUuid, tenantId, and enrollmentToken are required' }, { status: 400 });
    }

    if (enrollmentToken !== 'valid_enterprise_token') {
      return NextResponse.json({ error: 'Invalid or expired enterprise enrollment token' }, { status: 403 });
    }

    const id = `mdm_dev_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    await db.insert(mdmEnrolledDevices).values({
      id,
      tenantId,
      deviceUuid,
      deviceModel: deviceModel || 'Enterprise Managed Handset',
      osVersion: osVersion || 'Android/iOS Managed',
      status: 'ACTIVE',
      enrolledAt: now,
      lastSyncAt: now,
    });

    return NextResponse.json({
      success: true,
      enrolledDeviceId: id,
      tenantId,
      status: 'ACTIVE',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Enrollment failed' }, { status: 500 });
  }
}
