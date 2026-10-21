import { resolveRequestInstitution, requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { NextResponse } from 'next/server';
import { VisionDbStore } from '@/lib/db/vision-store';
import { LockdownOrchestrator } from '@/lib/operations/vision/emergency/lockdown-orchestrator';
import { lockdownTriggerSchema } from '@/lib/validation/vision-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const rl = checkRateLimit(session.staffId || session.userId || "anon", "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId"));
  const status = searchParams.get('status') || undefined;

  const store = VisionDbStore.getInstance();
  const lockdowns = await store.listLockdownEvents(tenantId, status);
  return NextResponse.json({ lockdowns });
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
    const tenantId = await resolveRequestInstitution(session, body.institutionId || session?.institutionId);
    const store = VisionDbStore.getInstance();
    const orchestrator = new LockdownOrchestrator(undefined, undefined, store);

    if (body.action === 'lift_lockdown') {
      if (!body.lockdownId) {
        return NextResponse.json({ error: 'lockdownId is required to lift lockdown' }, { status: 400 });
      }

      const existing = await store.getLockdownEventById(body.lockdownId, tenantId);
      if (!existing) {
        return NextResponse.json({ error: 'Lockdown event not found' }, { status: 404 });
      }
      if (existing.status === 'all_clear') {
        return NextResponse.json({ error: 'Lockdown has already been lifted' }, { status: 409 });
      }

      const lifted = await orchestrator.liftLockdown(
        body.lockdownId,
        tenantId,
        session?.staffId || 'admin',
        body.reason
      );
      return NextResponse.json({ lockdown: lifted }, { status: 200 });
    }

    const parsed = lockdownTriggerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    if (parsed.data.scope === 'facility' && !parsed.data.targetFacilityId) {
      return NextResponse.json({ error: 'targetFacilityId is required when scope is facility' }, { status: 400 });
    }
    if (parsed.data.scope === 'zone' && !parsed.data.targetZoneId) {
      return NextResponse.json({ error: 'targetZoneId is required when scope is zone' }, { status: 400 });
    }

    const result = await orchestrator.triggerLockdown({
      scope: parsed.data.scope,
      targetFacilityId: parsed.data.targetFacilityId,
      targetZoneId: parsed.data.targetZoneId,
      reason: parsed.data.reason,
      triggeredByUserId: session?.staffId || 'admin',
      triggerEcoMeshIslanding: parsed.data.triggerEcoMeshIslanding,
      tenantId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    const status = err.statusCode || (err.message && err.message.includes('already exists') ? 409 : 500);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status });
  }
}, 'vision:lockdown:execute');
