import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { neuroStore } from '@/lib/db/neuro-store';
import { gpuCreateSchema } from '@/lib/validation/neuro-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const nodeId = searchParams.get('nodeId') || undefined;

  const gpus = await neuroStore.listGpus(nodeId, tenantId);
  return NextResponse.json({ gpus });
}, 'neuro:gpus:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = gpuCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid GPU payload' }, { status: 400 });
    }

    const tenantId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const gpu = await neuroStore.createGpu({
      ...parsed.data,
      institutionId: tenantId,
    });

    return NextResponse.json({ gpu }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'neuro:gpus:manage');
