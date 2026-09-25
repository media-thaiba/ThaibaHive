import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { curriculumStore } from '@/lib/db/curriculum-store';
import { planCreateSchema, planApprovalSchema } from '@/lib/validation/curriculum-schemas';
import { PrerequisiteValidator } from '@/lib/operations/curriculum/graph/prerequisite-validator';
import { advisingMerkleAnchor } from '@/lib/operations/curriculum/security/advising-merkle-anchor';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const planId = searchParams.get('planId') || undefined;
  const studentId = searchParams.get('studentId') || user?.id || undefined;

  if (planId) {
    const plan = await curriculumStore.getDegreePlan(planId, tenantId);
    if (!plan) return NextResponse.json({ error: 'Degree plan not found' }, { status: 404 });
    return NextResponse.json({ plan });
  }

  if (studentId) {
    const plans = await curriculumStore.listDegreePlansForStudent(studentId, tenantId);
    return NextResponse.json({ plans });
  }

  return NextResponse.json({ error: 'Missing planId or studentId parameter' }, { status: 400 });
}, 'curriculum:plans:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = planCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const tenantId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const { courses, ...planData } = parsed.data;

    // Create plan header
    const plan = await curriculumStore.createDegreePlan({
      ...planData,
      institutionId: tenantId,
    });

    // Populate plan courses if supplied
    if (parsed.data.courses && parsed.data.courses.length > 0) {
      await curriculumStore.setPlanCourses(plan.planId, parsed.data.courses, tenantId);
    }

    // Validate plan
    const allCourses = await curriculumStore.listCourses(tenantId);
    const allPrereqs = await curriculumStore.listAllPrerequisites(tenantId);
    const validator = new PrerequisiteValidator(allCourses, allPrereqs);

    const fullPlan = await curriculumStore.getDegreePlan(plan.planId, tenantId);
    const validation = validator.validatePlan(fullPlan!, fullPlan?.courses || []);

    return NextResponse.json({ plan: fullPlan, validation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'curriculum:plans:edit');

export const PATCH = requireAuth(async (req: Request, user: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');
    if (!planId) return NextResponse.json({ error: 'Missing planId parameter' }, { status: 400 });

    const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
    const body = await req.json();
    const parsed = planApprovalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    let auditHash: string | undefined = undefined;
    if (parsed.data.status === 'approved') {
      const anchor = advisingMerkleAnchor.anchorAuditRecord({
        auditId: `audit_plan_${Date.now()}`,
        actionType: 'plan_approved',
        planId,
        performedByUserId: user?.id || 'advisor',
        actorRole: user?.role || 'staff',
        justification: parsed.data.justification || 'Degree plan approved by advisor',
        auditTimestamp: new Date().toISOString(),
      });
      auditHash = anchor.merkleRoot;
    }

    const updated = await curriculumStore.updateDegreePlanStatus(
      planId,
      parsed.data.status,
      parsed.data.advisorId || user?.id,
      auditHash,
      tenantId
    );

    if (!updated) return NextResponse.json({ error: 'Degree plan not found' }, { status: 404 });
    return NextResponse.json({ plan: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'curriculum:plans:approve');
