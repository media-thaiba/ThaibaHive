import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { engageCampaignUpdateSchema } from '@/lib/validation/engage-schemas';
import { EngageDbStore } from '@/lib/db/engage-store';

const store = EngageDbStore.getInstance();

export const GET = requireAuth(async (request: Request, context?: any) => {
  try {
    const params = await context?.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });

    const message = await store.getMessageAsync(`camp_msg_${id}`, 'global');
    if (!message) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, campaign: message }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch campaign' }, { status: 500 });
  }
}, 'engage:campaign:view');

export const PATCH = requireAuth(async (request: Request, context?: any) => {
  try {
    const params = await context?.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });

    const message = await store.getMessageAsync(`camp_msg_${id}`, 'global');
    if (!message) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const body = await request.json();
    const parse = engageCampaignUpdateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const updated = {
      ...message,
      ...(parse.data.subject !== undefined ? { subject: parse.data.subject } : {}),
      ...(parse.data.body !== undefined ? { body: parse.data.body } : {}),
      ...(parse.data.status !== undefined ? { status: parse.data.status } : {}),
    };

    await store.saveMessageAsync(updated);

    return NextResponse.json({ success: true, campaign: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update campaign' }, { status: 500 });
  }
}, 'engage:campaign:manage');

export const DELETE = requireAuth(async (request: Request, context?: any) => {
  try {
    const params = await context?.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });

    const message = await store.getMessageAsync(`camp_msg_${id}`, 'global');
    if (!message) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    await store.saveMessageAsync({
      messageId: `camp_msg_${id}`,
      status: 'cancelled',
      institutionId: 'global',
    });

    return NextResponse.json({ success: true, cancelledId: id }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete campaign' }, { status: 500 });
  }
}, 'engage:campaign:manage');
