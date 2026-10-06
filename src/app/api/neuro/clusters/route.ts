import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { neuroStore } from '@/lib/db/neuro-store';
import { clusterCreateSchema } from '@/lib/validation/neuro-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("institutionId") || searchParams.get("tenantId"));

  const clusters = await neuroStore.listClusters(tenantId);
  return NextResponse.json({ clusters });
}, 'neuro:clusters:view');

export const POST = requireAuth(async (req: Request, session: any) => {
  try {
    const body = await req.json();
    const parsed = clusterCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid cluster payload' }, { status: 400 });
    }

    const tenantId = await resolveRequestInstitution(session, parsed.data.institutionId);
    const cluster = await neuroStore.createCluster({
      ...parsed.data,
      institutionId: tenantId,
    });

    return NextResponse.json({ cluster }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'neuro:clusters:manage');
