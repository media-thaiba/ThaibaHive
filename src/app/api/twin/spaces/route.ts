import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { spaceCreateSchema, spaceUpdateSchema } from '@/lib/validation/twin-schemas';
import { TwinDbStore } from '@/lib/db/twin-store';
import { TwinAuditLogger } from '@/lib/operations/twin/security/twin-audit-logger';

const store = TwinDbStore.getInstance();
const auditLogger = TwinAuditLogger.getInstance();

export const GET = requireAuth(async (request: Request, user: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
    const facilityId = searchParams.get('facilityId') || undefined;

    const spaces = await store.listSpaces(tenantId, facilityId);
    return NextResponse.json({ success: true, spaces }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list spaces' }, { status: 500 });
  }
}, 'twin:facilities:read');

export const POST = requireAuth(async (request: Request, user: any) => {
  try {
    const body = await request.json();
    const parse = spaceCreateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const space = await store.createSpace(parse.data);
    auditLogger.logEvent('space_created', user?.id || 'system', { spaceId: space.spaceId }, parse.data.institutionId, parse.data.facilityId);

    return NextResponse.json({ success: true, space }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create space' }, { status: 500 });
  }
}, 'twin:facilities:write');

export const PATCH = requireAuth(async (request: Request, user: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');
    const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';

    if (!spaceId) {
      return NextResponse.json({ error: 'spaceId is required' }, { status: 400 });
    }

    const body = await request.json();
    const parse = spaceUpdateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const updated = await store.updateSpace(spaceId, parse.data as any, tenantId);
    if (!updated) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    auditLogger.logEvent('space_updated', user?.id || 'system', { spaceId, updates: parse.data }, tenantId);
    return NextResponse.json({ success: true, space: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update space' }, { status: 500 });
  }
}, 'twin:facilities:write');
