import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { curriculumStore } from '@/lib/db/curriculum-store';
import { programCreateSchema } from '@/lib/validation/curriculum-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId"));
  const status = searchParams.get('status') || undefined;

  const programs = await curriculumStore.listPrograms(tenantId, status);
  return NextResponse.json({ programs });
}, 'curriculum:plans:view');

export const POST = requireAuth(async (req: Request, session: any) => {
  try {
    const body = await req.json();
    const parsed = programCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const tenantId = await resolveRequestInstitution(session, parsed.data.institutionId);
    const program = await curriculumStore.createProgram({
      ...parsed.data,
      institutionId: tenantId,
    });

    return NextResponse.json({ program }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'curriculum:catalog:manage');
