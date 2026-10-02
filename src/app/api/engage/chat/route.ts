import { NextResponse } from 'next/server';
import { ChatGateway } from '@/lib/operations/engage/conversational/chat-gateway';
import { withPublicApm } from '@/lib/api/public-apm';
import { verifySession } from '@thaiba/auth';
import { resolveScopedInstitutionId } from '@/lib/api/tenant-scope';

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

    const session = await verifySession();
    let resolvedTenant = "global";

    if (session) {
      resolvedTenant = await resolveScopedInstitutionId(institutionId);
    } else if (typeof institutionId === "string" && institutionId.trim().length > 0) {
      resolvedTenant = institutionId.trim();
    }

    const gateway = ChatGateway.getInstance();
    const response = await gateway.handleInboundMessage(
      sessionId,
      stakeholderId || (session ? session.staffId : 'anonymous_user'),
      text,
      resolvedTenant
    );

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process chat message' },
      { status: 500 }
    );
  }
});
