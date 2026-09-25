import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { neuroStore } from '@/lib/db/neuro-store';
import { GpuSchedulerEngine } from '@/lib/operations/neuro/scheduler/gpu-scheduler-engine';
import { quotaUpdateSchema } from '@/lib/validation/neuro-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';

  const quotas = await neuroStore.listFairShareQuotas(tenantId);
  return NextResponse.json({ quotas });
}, 'neuro:scheduler:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
    const action = searchParams.get('action') || 'evaluate';

    if (action === 'evaluate') {
      const scheduler = new GpuSchedulerEngine(neuroStore);
      const result = await scheduler.evaluateQueue(tenantId);
      return NextResponse.json({ cycleResult: result });
    }

    if (action === 'update_quota') {
      const body = await req.json();
      const parsed = quotaUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid quota payload' }, { status: 400 });
      }

      const quota = await neuroStore.setFairShareQuota({
        ...parsed.data,
        institutionId: tenantId,
      });

      return NextResponse.json({ quota });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'neuro:scheduler:manage');
