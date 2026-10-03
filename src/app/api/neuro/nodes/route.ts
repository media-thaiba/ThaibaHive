import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { neuroStore } from '@/lib/db/neuro-store';
import { nodeCreateSchema } from '@/lib/validation/neuro-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId"));
  const clusterId = searchParams.get('clusterId') || undefined;

  const nodes = await neuroStore.listNodes(clusterId, tenantId);
  return NextResponse.json({ nodes });
}, 'neuro:nodes:view');

export const POST = requireAuth(async (req: Request, session: any) => {
  try {
    const body = await req.json();
    const parsed = nodeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid node payload' }, { status: 400 });
    }

    const tenantId = await resolveRequestInstitution(session, parsed.data.institutionId);
    const node = await neuroStore.createNode({
      ...parsed.data,
      institutionId: tenantId,
    });

    return NextResponse.json({ node }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'neuro:nodes:manage');
