import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { facilityStore } from '@/lib/db/facility-store';
import { workOrderEngine } from '@/lib/operations/facility/workorders/work-order-engine';
import { facilityStreamManager } from '@/lib/operations/facility/streaming/facility-stream-manager';
import { workOrderCreateSchema, workOrderTransitionSchema } from '@/lib/validation/facility-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId"));
  const status = (searchParams.get('status') as any) || undefined;
  const priority = (searchParams.get('priority') as any) || undefined;

  const workOrders = await facilityStore.listWorkOrders(tenantId, status, priority);
  return NextResponse.json({ workOrders });
}, 'facility:workorders:view');

export const POST = requireAuth(async (req: Request, session: any) => {
  try {
    const body = await req.json();

    // Check if auto-creating from anomaly alert
    if (body.anomalyAlertId && !body.title) {
      const tenantId = body.institutionId || session?.institutionId || 'global';
      const created = await workOrderEngine.autoCreateFromAnomaly(body.anomalyAlertId, tenantId);
      if (!created) {
        return NextResponse.json({ error: `Anomaly alert '${body.anomalyAlertId}' not found` }, { status: 404 });
      }
      return NextResponse.json({ workOrder: created }, { status: 201 });
    }

    const parsed = workOrderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid work order payload' }, { status: 400 });
    }

    const tenantId = await resolveRequestInstitution(session, parsed.data.institutionId);
    const woNumber = parsed.data.workOrderNumber || `WO-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const workOrder = await facilityStore.createWorkOrder({
      ...parsed.data,
      workOrderNumber: woNumber,
      institutionId: tenantId,
    });

    facilityStreamManager.broadcast({
      eventType: 'work_order_update',
      timestamp: new Date().toISOString(),
      institutionId: tenantId,
      data: workOrder,
    });

    return NextResponse.json({ workOrder }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'facility:workorders:create');

export const PATCH = requireAuth(async (req: Request, session: any) => {
  try {
    const body = await req.json();
    const parsed = workOrderTransitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid transition payload' }, { status: 400 });
    }

    const tenantId = await resolveRequestInstitution(session, parsed.data.institutionId);
    const transitionRes = await workOrderEngine.transitionState(
      {
        workOrderNumber: parsed.data.workOrderNumber,
        fromStatus: parsed.data.fromStatus,
        toStatus: parsed.data.toStatus,
        actorId: session?.staffId || 'admin_user',
        actorRole: session?.role || 'staff',
        notes: parsed.data.notes,
        technicianSignature: parsed.data.technicianSignature,
        actualDurationMinutes: parsed.data.actualDurationMinutes,
        consumedParts: parsed.data.consumedParts,
      },
      tenantId
    );

    if (!transitionRes.success) {
      return NextResponse.json({ error: transitionRes.error || 'Transition failed' }, { status: 400 });
    }

    const updatedWo = await facilityStore.getWorkOrder(parsed.data.workOrderNumber, tenantId);

    facilityStreamManager.broadcast({
      eventType: 'work_order_update',
      timestamp: new Date().toISOString(),
      institutionId: tenantId,
      data: updatedWo,
    });

    return NextResponse.json({ transition: transitionRes, workOrder: updatedWo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'facility:workorders:execute');
