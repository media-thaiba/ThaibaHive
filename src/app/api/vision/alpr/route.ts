import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { VisionDbStore } from '@/lib/db/vision-store';
import { GateAccessController } from '@/lib/operations/vision/alpr/gate-access-controller';
import { vehicleWhitelistCreateSchema, alprIngestSchema } from '@/lib/validation/vision-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const plateNumber = searchParams.get('plateNumber') || undefined;

  const store = VisionDbStore.getInstance();
  const logs = await store.listAlprLogs(tenantId, plateNumber);
  const whitelist = await store.listVehicleWhitelist(tenantId);
  return NextResponse.json({ logs, whitelist });
}, 'vision:alerts:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const store = VisionDbStore.getInstance();
    const tenantId = user?.institutionId || 'global';

    if (body.action === 'register_whitelist') {
      const parsed = vehicleWhitelistCreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
      }

      const permit = await store.createVehicleWhitelist({
        ...parsed.data,
        institutionId: tenantId,
      });
      return NextResponse.json({ permit }, { status: 201 });
    }

    // ALPR Ingestion & Gate Decision
    const parsed = alprIngestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const controller = new GateAccessController(store);
    const decision = await controller.evaluateGateAccess(
      parsed.data.plateNumber,
      parsed.data.gateId,
      parsed.data.facilityId,
      parsed.data.direction,
      tenantId
    );

    const log = await store.recordAlprLog({
      logId: `alpr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      cameraId: parsed.data.cameraId,
      plateNumber: parsed.data.plateNumber,
      confidenceScore: parsed.data.confidenceScore,
      direction: parsed.data.direction,
      gateId: parsed.data.gateId,
      vehicleType: parsed.data.vehicleType,
      permitStatus: decision.permitStatus,
      gateActuated: decision.gateActuated,
      capturedAt: new Date().toISOString(),
      institutionId: tenantId,
    });

    return NextResponse.json({ log, decision }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'vision:alpr:manage');
