import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { curriculumStore } from '@/lib/db/curriculum-store';
import { courseCreateSchema } from '@/lib/validation/curriculum-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId"));
  const departmentId = searchParams.get('departmentId') || undefined;
  const level = searchParams.get('level') ? parseInt(searchParams.get('level')!) : undefined;

  const courses = await curriculumStore.listCourses(tenantId, departmentId, level);
  return NextResponse.json({ courses });
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

  const parsed = courseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
  }

  const tenantId = await resolveRequestInstitution(session, parsed.data.institutionId);

  // Tenant-scoped duplicate courseCode check
  const existing = await curriculumStore.getCourseById(parsed.data.courseCode, tenantId);
  if (existing) {
    return NextResponse.json(
      { error: `Course with code '${parsed.data.courseCode}' already exists in this institution` },
      { status: 409 }
    );
  }

  const course = await curriculumStore.createCourse({
    ...parsed.data,
    institutionId: tenantId,
  });

  return NextResponse.json({ course }, { status: 201 });
}, 'curriculum:catalog:manage');
