import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { neuroStore } from '@/lib/db/neuro-store';
import { jobUpdateSchema } from '@/lib/validation/neuro-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (_req, session: any, context) => {
  const { id } = await context!.params;
  const tenantId = await resolveRequestInstitution(session);
  const job = await neuroStore.getJobById(id, tenantId);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const checkpoints = await neuroStore.listCheckpoints(job.id, tenantId);
  return NextResponse.json({ job, checkpoints });
}, 'neuro:jobs:view');

export const PATCH = requireAuth(async (req: Request, session: any, context) => {
  const { id } = await context!.params;
  const tenantId = await resolveRequestInstitution(session);

  try {
    const body = await req.json();
    const parsed = jobUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid update payload' }, { status: 400 });
    }

    const updated = await neuroStore.updateJob(id, parsed.data, tenantId);
    if (!updated) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'neuro:jobs:manage');
