import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { engageWorkflowCreateSchema } from '@/lib/validation/engage-schemas';
import { EngageDbStore } from '@/lib/db/engage-store';

const store = EngageDbStore.getInstance();

export const GET = requireAuth(async () => {
  try {
    const workflows = await store.listWorkflowsAsync('global');
    return NextResponse.json({ success: true, workflows }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list workflows' }, { status: 500 });
  }
}, 'engage:workflow:manage');

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = engageWorkflowCreateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const data = parse.data;
    await store.saveWorkflowAsync({
      workflowId: data.workflowId,
      name: data.name,
      triggerEvent: data.triggerEvent,
      triggerConditionData: data.triggerConditionData,
      stepsData: data.steps,
      isActive: data.isActive,
      institutionId: 'global',
    });

    return NextResponse.json({ success: true, workflowId: data.workflowId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create workflow' }, { status: 500 });
  }
}, 'engage:workflow:manage');
