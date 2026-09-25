import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { curriculumStore } from '@/lib/db/curriculum-store';
import { CurricularDagSolver } from '@/lib/operations/curriculum/graph/curricular-dag-solver';
import { BottleneckAnalyzer } from '@/lib/operations/curriculum/graph/bottleneck-analyzer';
import { GraduationSimulator } from '@/lib/operations/curriculum/graph/graduation-simulator';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const includeBottlenecks = searchParams.get('bottlenecks') === 'true';
  const includeSimulation = searchParams.get('simulate') === 'true';

  const courses = await curriculumStore.listCourses(tenantId);
  const prerequisites = await curriculumStore.listAllPrerequisites(tenantId);

  const solver = new CurricularDagSolver(courses, prerequisites);
  const toposort = solver.solveTopologicalSort();

  let bottlenecks: any = undefined;
  if (includeBottlenecks) {
    const analyzer = new BottleneckAnalyzer(courses, prerequisites);
    bottlenecks = analyzer.analyzeBottlenecks();
  }

  let simulation: any = undefined;
  if (includeSimulation) {
    const simulator = new GraduationSimulator(courses, prerequisites);
    simulation = simulator.simulateCohort(200, 8);
  }

  return NextResponse.json({
    toposort: {
      ...toposort,
      termTiers: Object.fromEntries(toposort.termTiers.entries()),
    },
    bottlenecks,
    simulation,
  });
}, 'curriculum:plans:view');
