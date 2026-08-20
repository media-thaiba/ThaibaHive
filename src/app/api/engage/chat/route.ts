import { NextResponse } from 'next/server';
import { ChatGateway } from '@/lib/operations/engage/conversational/chat-gateway';
import { withPublicApm } from '@/lib/api/public-apm';

export const POST = withPublicApm(async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, stakeholderId, text, institutionId } = body;

    if (!sessionId || !text) {
      return NextResponse.json(
        { error: 'sessionId and text are required' },
        { status: 400 }
      );
    }

    const gateway = ChatGateway.getInstance();
    const response = await gateway.handleInboundMessage(
      sessionId,
      stakeholderId || 'anonymous_user',
      text,
      institutionId || 'global'
    );

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process chat message' },
      { status: 500 }
    );
  }
});
