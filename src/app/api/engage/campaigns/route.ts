import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { engageCampaignCreateSchema } from '@/lib/validation/engage-schemas';
import { EngageDbStore } from '@/lib/db/engage-store';

const store = EngageDbStore.getInstance();

export const GET = requireAuth(async () => {
  try {
    const messages = await store.listMessagesAsync('global', 100);
    return NextResponse.json({ success: true, campaigns: messages }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list campaigns' }, { status: 500 });
  }
}, 'engage:campaign:view');

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = engageCampaignCreateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const data = parse.data;
    await store.saveMessageAsync({
      messageId: `camp_msg_${data.campaignId}`,
      campaignId: data.campaignId,
      templateId: data.templateId,
      recipientId: 'segment_' + data.targetSegment,
      recipientChannelAddress: 'broadcast',
      channel: data.channel,
      priority: data.priority,
      status: 'queued',
      subject: data.subject,
      body: data.body,
      scheduledAt: data.scheduledAt || new Date().toISOString(),
      institutionId: 'global',
    });

    return NextResponse.json({ success: true, campaignId: data.campaignId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create campaign' }, { status: 500 });
  }
}, 'engage:campaign:manage');
