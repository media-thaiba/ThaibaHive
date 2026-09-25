import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { curriculumStore } from '@/lib/db/curriculum-store';
import { DegreeAuditEngine } from '@/lib/operations/curriculum/audit/degree-audit-engine';
import { advisingMetrics } from '@/lib/operations/curriculum/telemetry/advising-metrics';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const studentId = searchParams.get('studentId') || user?.id;
  const programCode = searchParams.get('programCode') || 'CS_BS';

  if (!studentId) {
    return NextResponse.json({ error: 'Missing studentId parameter' }, { status: 400 });
  }

  let program = await curriculumStore.getProgramById(programCode, tenantId);
  if (!program) {
    // Fallback standard program if none yet created
    program = await curriculumStore.createProgram({
      programCode,
      title: 'B.S. in Computer Science',
      degreeType: 'bachelor',
      totalCreditsRequired: 120,
      minimumGpa: 2.0,
      institutionId: tenantId,
    });
  }

  const catalogCourses = await curriculumStore.listCourses(tenantId);
  const engine = new DegreeAuditEngine();

  // Retrieve student plan/courses to construct simulated transcript
  const plans = await curriculumStore.listDegreePlansForStudent(studentId, tenantId);
  const transcript: any[] = [];
  const inProgress: string[] = [];

  if (plans.length > 0 && plans[0].courses) {
    for (const pc of plans[0].courses) {
      if (pc.status === 'completed' || pc.status === 'waived') {
        transcript.push({
          courseCode: pc.courseId,
          title: pc.termName,
          credits: pc.credits || 3,
          grade: pc.gradeReceived || 'B',
          qualityPoints: (pc.credits || 3) * 3.0,
          status: pc.status,
        });
      } else if (pc.status === 'enrolled' || pc.status === 'planned') {
        inProgress.push(pc.courseId);
      }
    }
  }

  const auditReport = engine.executeAudit(
    studentId,
    program,
    catalogCourses,
    transcript,
    inProgress
  );

  advisingMetrics.recordDegreeAudit();

  return NextResponse.json({ auditReport });
}, 'curriculum:audit:execute');
