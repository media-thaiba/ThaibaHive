import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mdmEnrolledDevices } from '@/db/schema';
import { requireAuth } from '@/lib/api/auth-guard';
import crypto from 'crypto';

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const { deviceUuid, deviceModel, osVersion, enrollmentToken } = body;

    if (!deviceUuid || !enrollmentToken) {
      return NextResponse.json({ error: 'deviceUuid and enrollmentToken are required' }, { status: 400 });
    }

    const expectedToken = process.env.MDM_ENROLLMENT_TOKEN;
    if (!expectedToken) {
      return NextResponse.json({ error: 'MDM enrollment token is not configured on server' }, { status: 500 });
    }
    const submittedBuf = Buffer.from(String(enrollmentToken));
    const expectedBuf = Buffer.from(expectedToken);

    const tokenValid =
      submittedBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(submittedBuf, expectedBuf);

    if (!tokenValid) {
      return NextResponse.json({ error: 'Invalid or expired enterprise enrollment token' }, { status: 403 });
    }

    const tenantId = await resolveRequestInstitution(session, body.tenantId);
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
}, "sync:manage");
