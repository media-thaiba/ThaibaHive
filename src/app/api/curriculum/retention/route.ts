import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { curriculumStore } from '@/lib/db/curriculum-store';
import { retentionAlertUpdateSchema } from '@/lib/validation/curriculum-schemas';
import { EarlyInterventionWorkflow } from '@/lib/operations/curriculum/retention/early-intervention-workflow';
import { RiskFeatureExtractor } from '@/lib/operations/curriculum/retention/risk-feature-extractor';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const riskTier = searchParams.get('riskTier') || undefined;
  const status = searchParams.get('status') || undefined;

  const alerts = await curriculumStore.listRetentionAlerts(tenantId, riskTier, status);
  return NextResponse.json({ alerts });
}, 'curriculum:retention:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const tenantId = (body.institutionId !== 'global' ? body.institutionId : undefined) || user?.institutionId || 'global';

    const extractor = new RiskFeatureExtractor();
    const workflow = new EarlyInterventionWorkflow();

    const features = extractor.extractFeatures(
      body.studentId || 'stud_eval',
      body.cumulativeGpa ?? 2.0,
      body.priorTermGpa ?? 2.5,
      body.courseDropCount ?? 0,
      body.prerequisiteFailureCount ?? 0,
      body.attendancePercentage ?? 80,
      body.lmsSubmissionDelayDays ?? 0,
      body.enrolledCredits ?? 15
    );

    const evaluation = await workflow.evaluateAndTrigger(
      features,
      body.studentName || 'Student',
      body.contactEmail || 'student@thaibahive.edu',
      body.channel || 'email',
      tenantId
    );

    return NextResponse.json({ evaluation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'curriculum:retention:intervene');

export const PATCH = requireAuth(async (req: Request, user: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const alertId = searchParams.get('alertId');
    if (!alertId) return NextResponse.json({ error: 'Missing alertId parameter' }, { status: 400 });

    const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
    const body = await req.json();
    const parsed = retentionAlertUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const updated = await curriculumStore.updateRetentionAlertStatus(
      alertId,
      parsed.data.status,
      parsed.data.resolutionNotes,
      parsed.data.assignedCounselorId || user?.id,
      tenantId
    );

    if (!updated) return NextResponse.json({ error: 'Retention alert not found' }, { status: 404 });
    return NextResponse.json({ alert: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'curriculum:retention:intervene');
