import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { curriculumStore } from '@/lib/db/curriculum-store';
import { prerequisiteCreateSchema } from '@/lib/validation/curriculum-schemas';
import { CurricularDagSolver } from '@/lib/operations/curriculum/graph/curricular-dag-solver';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId"));
  const courseId = searchParams.get('courseId') || undefined;

  if (courseId) {
    const prerequisites = await curriculumStore.getPrerequisitesForCourse(courseId, tenantId);
    return NextResponse.json({ prerequisites });
  }

  const prerequisites = await curriculumStore.listAllPrerequisites(tenantId);
  return NextResponse.json({ prerequisites });
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

  const parsed = prerequisiteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
  }

  const tenantId = await resolveRequestInstitution(session, parsed.data.institutionId);

  // Existence check: both courses must exist in this tenant
  const targetCourse = await curriculumStore.getCourseById(parsed.data.courseId, tenantId);
  const prereqCourse = await curriculumStore.getCourseById(parsed.data.prerequisiteCourseId, tenantId);
  if (!targetCourse || !prereqCourse) {
    return NextResponse.json(
      { error: "One or both specified courses do not exist in this institution" },
      { status: 404 }
    );
  }

  // Duplicate prerequisite link check
  const existingPrereqs = await curriculumStore.listAllPrerequisites(tenantId);
  const duplicate = existingPrereqs.find(
    (p) => (p.courseId === parsed.data.courseId || p.courseId === targetCourse.id) &&
           (p.prerequisiteCourseId === parsed.data.prerequisiteCourseId || p.prerequisiteCourseId === prereqCourse.id)
  );
  if (duplicate) {
    return NextResponse.json(
      { error: "This prerequisite link already exists in this institution" },
      { status: 409 }
    );
  }

  // Cycle check: verify adding this prerequisite does not create circular dependency
  const allCourses = await curriculumStore.listCourses(tenantId);
  const candidatePrereqs = [
    ...existingPrereqs,
    {
      ...parsed.data,
      courseId: targetCourse.id,
      prerequisiteCourseId: prereqCourse.id,
      id: 'temp_check',
      createdAt: ''
    }
  ];

  const solver = new CurricularDagSolver(allCourses, candidatePrereqs);
  const sortResult = solver.solveTopologicalSort();

  if (sortResult.hasCycle) {
    return NextResponse.json({
      error: `Cannot add prerequisite: circular dependency cycle detected (${sortResult.cyclePath?.join(' -> ')})`,
      cyclePath: sortResult.cyclePath,
    }, { status: 409 });
  }

  const prerequisite = await curriculumStore.addPrerequisite({
    ...parsed.data,
    courseId: targetCourse.id,
    prerequisiteCourseId: prereqCourse.id,
    institutionId: tenantId,
  });

  return NextResponse.json({ prerequisite }, { status: 201 });
}, 'curriculum:catalog:manage');
