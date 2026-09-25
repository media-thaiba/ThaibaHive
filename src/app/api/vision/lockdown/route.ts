import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { VisionDbStore } from '@/lib/db/vision-store';
import { LockdownOrchestrator } from '@/lib/operations/vision/emergency/lockdown-orchestrator';
import { lockdownTriggerSchema } from '@/lib/validation/vision-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const status = searchParams.get('status') || undefined;

  const store = VisionDbStore.getInstance();
  const lockdowns = await store.listLockdownEvents(tenantId, status);
  return NextResponse.json({ lockdowns });
}, 'vision:alerts:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const tenantId = user?.institutionId || 'global';
    const orchestrator = new LockdownOrchestrator();

    if (body.action === 'lift_lockdown') {
      if (!body.lockdownId) {
        return NextResponse.json({ error: 'lockdownId is required to lift lockdown' }, { status: 400 });
      }
      const lifted = await orchestrator.liftLockdown(body.lockdownId, tenantId);
      return NextResponse.json({ lockdown: lifted }, { status: 200 });
    }

    const parsed = lockdownTriggerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const result = await orchestrator.triggerLockdown({
      scope: parsed.data.scope,
      targetFacilityId: parsed.data.targetFacilityId,
      targetZoneId: parsed.data.targetZoneId,
      reason: parsed.data.reason,
      triggeredByUserId: user?.id || 'admin',
      triggerEcoMeshIslanding: parsed.data.triggerEcoMeshIslanding,
      tenantId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'vision:lockdown:execute');
