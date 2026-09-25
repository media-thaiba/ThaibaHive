import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { VisionDbStore } from '@/lib/db/vision-store';
import { IncidentLedgerEngine } from '@/lib/operations/vision/incidents/incident-ledger-engine';
import { incidentUpdateSchema } from '@/lib/validation/vision-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const status = searchParams.get('status') || undefined;
  const facilityId = searchParams.get('facilityId') || undefined;

  const store = VisionDbStore.getInstance();
  const incidents = await store.listSecurityIncidents(tenantId, status, facilityId);
  return NextResponse.json({ incidents });
}, 'vision:alerts:view');

export const PATCH = requireAuth(async (req: Request, user: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const incidentId = searchParams.get('incidentId');
    if (!incidentId) {
      return NextResponse.json({ error: 'incidentId query parameter is required' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = incidentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const tenantId = user?.institutionId || 'global';
    const engine = new IncidentLedgerEngine();
    const updated = await engine.transitionIncidentStatus(
      incidentId,
      parsed.data.status,
      parsed.data.leadGuardId,
      tenantId
    );

    return NextResponse.json({ incident: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'vision:incidents:manage');
