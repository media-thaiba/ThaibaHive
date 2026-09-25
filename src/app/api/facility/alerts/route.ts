import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { facilityStore } from '@/lib/db/facility-store';
import { anomalyAlertTriageSchema } from '@/lib/validation/facility-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const status = (searchParams.get('status') as any) || undefined;

  const alerts = await facilityStore.listAnomalyAlerts(tenantId, status);
  return NextResponse.json({ alerts });
}, 'facility:alerts:view');

export const PATCH = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = anomalyAlertTriageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid alert triage payload' }, { status: 400 });
    }

    const tenantId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const updated = await facilityStore.updateAlertStatus(
      parsed.data.alertId,
      parsed.data.status,
      parsed.data.notes,
      user?.staffId,
      tenantId
    );

    if (!updated) {
      return NextResponse.json({ error: `Alert '${parsed.data.alertId}' not found` }, { status: 404 });
    }

    return NextResponse.json({ alert: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'facility:alerts:triage');
