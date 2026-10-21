import { resolveRequestInstitution, requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { NextResponse } from 'next/server';
import { VisionDbStore } from '@/lib/db/vision-store';
import { GateAccessController } from '@/lib/operations/vision/alpr/gate-access-controller';
import { IncidentLedgerEngine } from '@/lib/operations/vision/incidents/incident-ledger-engine';
import { vehicleWhitelistCreateSchema, alprIngestSchema } from '@/lib/validation/vision-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const rl = checkRateLimit(session.staffId || session.userId || "anon", "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId"));
  const plateNumber = searchParams.get('plateNumber') || undefined;

  const store = VisionDbStore.getInstance();
  const logs = await store.listAlprLogs(tenantId, plateNumber);
  const whitelist = await store.listVehicleWhitelist(tenantId);
  return NextResponse.json({ logs, whitelist });
}, 'vision:alerts:view');

export const POST = requireAuth(async (req: Request, session: any) => {
  const rl = checkRateLimit(session.staffId || session.userId || "anon", "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request payload" }, { status: 400 });
    }
    const store = VisionDbStore.getInstance();
    const tenantId = await resolveRequestInstitution(session, body.institutionId || session?.institutionId);

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

    let threatAlert = undefined;
    if (decision.isBlacklisted) {
      const incidentEngine = new IncidentLedgerEngine(store);
      threatAlert = await incidentEngine.processThreatAlert({
        cameraId: parsed.data.cameraId,
        threatType: 'blacklisted_vehicle',
        confidenceScore: parsed.data.confidenceScore,
        facilityId: parsed.data.facilityId,
        institutionId: tenantId,
      });
    }

    return NextResponse.json({ log, decision, threatAlert }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'vision:alpr:manage');
