import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { neuroStore } from '@/lib/db/neuro-store';
import { jobSubmitSchema } from '@/lib/validation/neuro-schemas';
import { GpuSchedulerEngine } from '@/lib/operations/neuro/scheduler/gpu-scheduler-engine';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const status = (searchParams.get('status') as any) || undefined;
  const departmentId = searchParams.get('departmentId') || undefined;

  const jobs = await neuroStore.listJobs({ status, departmentId }, tenantId);
  return NextResponse.json({ jobs });
}, 'neuro:jobs:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = jobSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid job submission payload' }, { status: 400 });
    }

    const tenantId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const jobId = `JOB_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const job = await neuroStore.createJob({
      ...parsed.data,
      jobId,
      userId: user?.id || 'staff_anonymous',
      institutionId: tenantId,
    });

    // Proactively trigger scheduler cycle
    const scheduler = new GpuSchedulerEngine(neuroStore);
    const schedulingCycle = await scheduler.evaluateQueue(tenantId);

    return NextResponse.json({ job, schedulingCycle }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'neuro:jobs:submit');
