import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { VisionDbStore } from '@/lib/db/vision-store';
import { IncidentLedgerEngine } from '@/lib/operations/vision/incidents/incident-ledger-engine';
import { threatAlertCreateSchema } from '@/lib/validation/vision-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const status = searchParams.get('status') || undefined;
  const threatType = searchParams.get('threatType') || undefined;
  const severity = searchParams.get('severity') || undefined;

  const store = VisionDbStore.getInstance();
  const alerts = await store.listThreatAlerts(tenantId, status, threatType, severity);
  return NextResponse.json({ alerts });
}, 'vision:alerts:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = threatAlertCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const tenantId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const engine = new IncidentLedgerEngine();
    const result = await engine.processThreatAlert({
      ...parsed.data,
      boundingPolygon: parsed.data.boundingPolygonJson ? JSON.parse(parsed.data.boundingPolygonJson) : undefined,
      institutionId: tenantId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'vision:alerts:manage');
