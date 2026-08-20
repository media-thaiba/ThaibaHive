import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { facilityCreateSchema } from '@/lib/validation/twin-schemas';
import { TwinDbStore } from '@/lib/db/twin-store';
import { TwinAuditLogger } from '@/lib/operations/twin/security/twin-audit-logger';

const store = TwinDbStore.getInstance();
const auditLogger = TwinAuditLogger.getInstance();

export const GET = requireAuth(async (request: Request, user: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
    const facilities = await store.listFacilities(tenantId);
    return NextResponse.json({ success: true, facilities }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list facilities' }, { status: 500 });
  }
}, 'twin:facilities:read');

export const POST = requireAuth(async (request: Request, user: any) => {
  try {
    const body = await request.json();
    const parse = facilityCreateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const facility = await store.createFacility(parse.data);
    auditLogger.logEvent('facility_created', user?.id || 'system', { facilityId: facility.facilityId }, parse.data.institutionId, facility.facilityId);

    return NextResponse.json({ success: true, facility }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create facility' }, { status: 500 });
  }
}, 'twin:facilities:write');
