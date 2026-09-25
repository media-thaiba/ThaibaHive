import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { FeeDbStore } from '@/db/fee-store';
import { ScholarshipEngine } from '@/lib/operations/finance/scholarships/scholarship-engine';
import { ScholarshipApprovalWorkflow } from '@/lib/operations/finance/scholarships/scholarship-approval-workflow';
import { applyConcessionSchema } from '@/lib/validation/fee-schemas';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const type = url.searchParams.get('type') || 'scholarships'; // 'scholarships' | 'concessions'

  const store = FeeDbStore.getInstance();
  if (type === 'concessions') {
    const list = await store.listConcessions(institutionId);
    return NextResponse.json({ success: true, concessions: list });
  }

  const list = await store.listScholarships(institutionId);
  return NextResponse.json({ success: true, scholarships: list });
}, 'finance:scholarships:view');

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const action = body.action || 'apply';
    const store = FeeDbStore.getInstance();

    if (action === 'apply') {
      const parsed = applyConcessionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
      }

      const engine = new ScholarshipEngine(store);
      const concession = await engine.submitConcessionApplication({
        institutionId: parsed.data.institutionId,
        studentId: parsed.data.studentId,
        scholarshipId: parsed.data.scholarshipId || 'sch_general_grant',
        allocationId: parsed.data.allocationId,
        appliedById: session.staffId || (session as any).userId || 'staff',
        reason: parsed.data.reason,
        supportingDocUrl: parsed.data.supportingDocUrl,
      });

      return NextResponse.json({ success: true, concession }, { status: 201 });
    }

    if (action === 'approve') {
      const { concessionId, decisionNotes } = body;
      if (!concessionId) return NextResponse.json({ error: 'concessionId is required' }, { status: 400 });

      const workflow = new ScholarshipApprovalWorkflow(store);
      const approved = await workflow.approveConcession(
        concessionId,
        session.staffId || (session as any).userId || 'staff',
        decisionNotes
      );

      return NextResponse.json({ success: true, concession: approved });
    }

    if (action === 'reject') {
      const { concessionId, reason } = body;
      if (!concessionId) return NextResponse.json({ error: 'concessionId is required' }, { status: 400 });

      const workflow = new ScholarshipApprovalWorkflow(store);
      const rejected = await workflow.rejectConcession(
        concessionId,
        session.staffId || (session as any).userId || 'staff',
        reason || 'Rejected by Board'
      );

      return NextResponse.json({ success: true, concession: rejected });
    }

    return NextResponse.json({ error: 'Invalid scholarship action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scholarship operation failed' }, { status: 500 });
  }
}, 'finance:scholarships:approve');
