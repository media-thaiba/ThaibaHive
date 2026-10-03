import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { curriculumStore } from '@/lib/db/curriculum-store';
import { prerequisiteCreateSchema } from '@/lib/validation/curriculum-schemas';
import { CurricularDagSolver } from '@/lib/operations/curriculum/graph/curricular-dag-solver';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
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
  try {
    const body = await req.json();
    const parsed = prerequisiteCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const tenantId = await resolveRequestInstitution(session, parsed.data.institutionId);

    // Cycle check: verify adding this prerequisite does not create circular dependency
    const allCourses = await curriculumStore.listCourses(tenantId);
    const existingPrereqs = await curriculumStore.listAllPrerequisites(tenantId);
    const candidatePrereqs = [...existingPrereqs, { ...parsed.data, id: 'temp_check', createdAt: '' }];

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
      institutionId: tenantId,
    });

    return NextResponse.json({ prerequisite }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'curriculum:catalog:manage');
