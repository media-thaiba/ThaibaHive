import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyDbStore } from '@/lib/db/supply-store';
import { milestoneCreateSchema } from '@/lib/validation/supply-schemas';
import { MilestoneTracker } from '@/lib/operations/supply/contracts/milestone-tracker';

export const dynamic = 'force-dynamic';

const store = SupplyDbStore.getInstance();

export const GET = requireAuth(async (req: Request, user: any, context) => {
  const { id } = await context!.params;
  const { searchParams } = new URL(req.url);
  const institutionId = searchParams.get('institutionId') || user?.institutionId || 'global';

  const milestones = await store.listMilestonesByContract(id, institutionId);
  return NextResponse.json({ milestones });
}, 'supply:contracts:manage');

export const POST = requireAuth(async (req: Request, user: any, context) => {
  const { id } = await context!.params;
  try {
    const body = await req.json();
    const parsed = milestoneCreateSchema.safeParse({ ...body, contractId: id });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid milestone payload' }, { status: 400 });
    }

    const institutionId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const milestoneId = `mile-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const milestone = {
      id: milestoneId,
      milestoneId,
      contractId: id,
      milestoneNumber: parsed.data.milestoneNumber,
      title: parsed.data.title,
      deliverableDescription: parsed.data.deliverableDescription,
      amountUsd: parsed.data.amountUsd,
      dueDate: parsed.data.dueDate,
      deliverableEvidenceUrl: parsed.data.deliverableEvidenceUrl,
      status: 'pending' as const,
      institutionId,
      createdAt: new Date().toISOString(),
    };

    const saved = await store.createMilestone(milestone);
    const readiness = MilestoneTracker.evaluateMilestoneReadiness(saved);

    return NextResponse.json({ milestone: saved, readiness }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'supply:contracts:manage');
