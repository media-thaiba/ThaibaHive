import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { curriculumStore } from '@/lib/db/curriculum-store';
import { programCreateSchema } from '@/lib/validation/curriculum-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId"));
  const status = searchParams.get('status') || undefined;

  const programs = await curriculumStore.listPrograms(tenantId, status);
  return NextResponse.json({ programs });
}, 'curriculum:plans:view');

export const POST = requireAuth(async (req: Request, session: any) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = programCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
  }

  const tenantId = await resolveRequestInstitution(session, parsed.data.institutionId);

  // Tenant-scoped duplicate programCode check
  const existing = await curriculumStore.getProgramById(parsed.data.programCode, tenantId);
  if (existing) {
    return NextResponse.json(
      { error: `Program with code '${parsed.data.programCode}' already exists in this institution` },
      { status: 409 }
    );
  }

  const program = await curriculumStore.createProgram({
    ...parsed.data,
    institutionId: tenantId,
  });

  return NextResponse.json({ program }, { status: 201 });
}, 'curriculum:catalog:manage');
