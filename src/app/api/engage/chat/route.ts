import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { ChatGateway } from '@/lib/operations/engage/conversational/chat-gateway';
import { resolveScopedInstitutionId } from '@/lib/api/tenant-scope';
import { engageChatMessageSchema } from '@/lib/validation/engage-schemas';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export const POST = requireAuth(async function POST(request: Request, session) {
  try {
    const rateLimitResult = checkRateLimit(session.staffId, 'write');
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetMs);
    }

    const body = await request.json();
    const parse = engageChatMessageSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { sessionId, stakeholderId, text, institutionId } = parse.data;
    const resolvedTenant = await resolveScopedInstitutionId(institutionId);

    const gateway = ChatGateway.getInstance();
    const response = await gateway.handleInboundMessage(
      sessionId,
      stakeholderId || session.staffId || 'staff_user',
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
}, 'engage:chat:interact');
