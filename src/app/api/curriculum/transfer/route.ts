import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { curriculumStore } from '@/lib/db/curriculum-store';
import { transferCreateSchema } from '@/lib/validation/curriculum-schemas';
import { TransferCreditParser } from '@/lib/operations/curriculum/transfer/transfer-credit-parser';
import { SemanticArticulationMatcher } from '@/lib/operations/curriculum/transfer/semantic-articulation-matcher';
import { advisingMetrics } from '@/lib/operations/curriculum/telemetry/advising-metrics';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const studentId = searchParams.get('studentId') || user?.id;

  if (!studentId) {
    return NextResponse.json({ error: 'Missing studentId parameter' }, { status: 400 });
  }

  const articulations = await curriculumStore.listTransferArticulationsForStudent(studentId, tenantId);
  return NextResponse.json({ articulations });
}, 'curriculum:plans:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const tenantId = user?.institutionId || 'global';

    // If raw OCR transcript text is supplied: parse and match
    if (body.rawTranscriptText) {
      const parser = new TransferCreditParser();
      const matcher = new SemanticArticulationMatcher();
      const parsedTranscript = parser.parseTranscriptText(body.rawTranscriptText);
      const catalog = await curriculumStore.listCourses(tenantId);

      const recommendations = parsedTranscript.courses.map((c) =>
        matcher.matchCourse(c, catalog)
      );

      advisingMetrics.recordTransferArticulation();

      return NextResponse.json({
        parsedTranscript,
        recommendations,
      });
    }

    // Standard transfer articulation persistence
    const parsed = transferCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const articulation = await curriculumStore.recordTransferArticulation({
      ...parsed.data,
      institutionId: tenantId,
    });

    advisingMetrics.recordTransferArticulation();

    return NextResponse.json({ articulation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'curriculum:transfer:articulate');
