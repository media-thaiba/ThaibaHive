import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { TwinDbStore } from '@/lib/db/twin-store';
import { SpatialPrivacyShield } from '@/lib/operations/twin/security/spatial-privacy-shield';

const store = TwinDbStore.getInstance();

export const GET = requireAuth(async (request: Request, user: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
    const sensorId = searchParams.get('sensorId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const telemetry = await store.listTelemetry(tenantId, sensorId, limit);
    const userRole = user?.role || 'student';
    const sanitized = telemetry.map((t) => SpatialPrivacyShield.anonymizeTelemetry(t as any, userRole));

    return NextResponse.json({ success: true, telemetry: sanitized }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get live telemetry' }, { status: 500 });
  }
}, 'twin:facilities:read');
