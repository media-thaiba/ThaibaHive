import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { engageChatMessageSchema } from '@/lib/validation/engage-schemas';
import { ChatGateway } from '@/lib/operations/engage/conversational/chat-gateway';
import { EngageDbStore } from '@/lib/db/engage-store';

const gateway = ChatGateway.getInstance();
const store = EngageDbStore.getInstance();

export const GET = requireAuth(async (request: Request) => {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId search param required' }, { status: 400 });
    }

    const messages = await store.listChatMessagesAsync(sessionId, 'global');
    const session = await store.getChatSessionAsync(sessionId, 'global');

    return NextResponse.json({ success: true, session, messages }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list conversation messages' }, { status: 500 });
  }
}, 'engage:chat:interact');

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = engageChatMessageSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { sessionId, stakeholderId, text } = parse.data;
    const response = await gateway.handleInboundMessage(sessionId, stakeholderId, text, 'global');

    return NextResponse.json({ success: true, ...response }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process conversation message' }, { status: 500 });
  }
}, 'engage:chat:interact');
