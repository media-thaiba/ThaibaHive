import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyDbStore } from '@/lib/db/supply-store';
import { requisitionCreateSchema } from '@/lib/validation/supply-schemas';
import { RequisitionRoutingEngine } from '@/lib/operations/supply/workflow/requisition-routing-engine';

export const dynamic = 'force-dynamic';

const store = SupplyDbStore.getInstance();
const routingEngine = RequisitionRoutingEngine.getInstance();

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const institutionId = searchParams.get('institutionId') || user?.institutionId || 'global';
  const requisitions = await store.listRequisitions(institutionId);
  return NextResponse.json({ requisitions });
}, 'supply:requisitions:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = requisitionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid requisition payload' }, { status: 400 });
    }

    const institutionId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const reqId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const requisitionNumber = `REQ-${Date.now().toString().slice(-6)}`;

    const preliminaryReq = {
      id: reqId,
      requisitionNumber,
      departmentId: parsed.data.departmentId,
      requesterId: user?.id || 'anonymous-requester',
      sourceType: parsed.data.sourceType,
      sourceReferenceId: parsed.data.sourceReferenceId,
      title: parsed.data.title,
      urgency: parsed.data.urgency,
      estimatedTotalUsd: parsed.data.estimatedTotalUsd,
      budgetCode: parsed.data.budgetCode,
      requiredByDate: parsed.data.requiredByDate,
      currentApprovalTier: 'hod' as const,
      status: 'pending_approval' as const,
      notes: parsed.data.notes,
      institutionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const routingDecision = routingEngine.evaluateRouting(preliminaryReq);

    const finalizedReq = {
      ...preliminaryReq,
      currentApprovalTier: routingDecision.determinedTier,
      status: (routingDecision.isAutoApproved ? 'approved' : 'pending_approval') as any,
      approvedByUserId: routingDecision.isAutoApproved ? 'SYSTEM_AUTO_POLICY' : undefined,
      approvedAt: routingDecision.isAutoApproved ? new Date().toISOString() : undefined,
    };

    const saved = await store.createRequisition(finalizedReq);
    return NextResponse.json({ requisition: saved, routingDecision }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'supply:requisitions:create');
