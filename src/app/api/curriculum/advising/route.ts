import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { curriculumStore } from '@/lib/db/curriculum-store';
import { advisingMessageSchema } from '@/lib/validation/curriculum-schemas';
import { advisorMesh } from '@/lib/operations/curriculum/advising/advisor-mesh-orchestrator';
import { catalogRag } from '@/lib/operations/curriculum/advising/catalog-rag-connector';
import { advisingStream } from '@/lib/operations/curriculum/streaming/advising-stream-manager';
import { advisingMetrics } from '@/lib/operations/curriculum/telemetry/advising-metrics';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const sessionId = searchParams.get('sessionId');

  if (sessionId) {
    const session = await curriculumStore.getAdvisingSession(sessionId, tenantId);
    const messages = await curriculumStore.getAdvisingMessages(sessionId, tenantId);
    return NextResponse.json({ session, messages });
  }

  const studentId = searchParams.get('studentId') || user?.id;
  const sessions = await curriculumStore.listAdvisingSessions(tenantId, studentId);
  return NextResponse.json({ sessions });
}, 'curriculum:advising:chat');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = advisingMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    const tenantId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const { sessionId, studentId, prompt, forcedDomain } = parsed.data;

    // Ensure session exists or create it
    let session = await curriculumStore.getAdvisingSession(sessionId, tenantId);
    if (!session) {
      session = await curriculumStore.createAdvisingSession({
        sessionId,
        studentId,
        activeDomain: forcedDomain || 'degree_planner',
        institutionId: tenantId,
      });
      advisingMetrics.recordSessionStarted();
    }

    // 1. Record student message
    await curriculumStore.addAdvisingMessage({
      sessionId,
      senderType: 'student',
      messageContent: prompt,
      institutionId: tenantId,
    });

    // 2. Build mock profile for evaluation
    const profile = {
      studentId,
      majorProgramCode: 'CS_BS',
      declaredCatalogYear: '2026-2027',
      cumulativeGpa: 3.40,
      majorGpa: 3.55,
      totalCompletedCredits: 48,
      termStanding: 3,
      academicStanding: 'good_standing' as const,
      passedCourses: [],
      inProgressCourses: [],
      institutionId: tenantId,
    };

    // 3. Handle multi-agent dialogue
    const agentResponse = await advisorMesh.handleDialogue(prompt, profile, forcedDomain);
    advisingMetrics.recordIntentRouted(agentResponse.agentDomain);

    // 4. Augment with RAG citations
    const catalogCitations = await catalogRag.retrieveCatalogContext(prompt, profile);
    const combinedCitations = [...agentResponse.citations, ...catalogCitations];

    // 5. Broadcast to SSE stream
    advisingStream.broadcastToSession(sessionId, 'domain_handoff', { domain: agentResponse.agentDomain }, tenantId);
    advisingStream.broadcastToSession(sessionId, 'token_chunk', { token: agentResponse.replyText }, tenantId);

    // 6. Record agent reply message
    const savedAgentMessage = await curriculumStore.addAdvisingMessage({
      sessionId,
      senderType: 'agent',
      agentDomain: agentResponse.agentDomain,
      messageContent: agentResponse.replyText,
      citationsJson: JSON.stringify(combinedCitations),
      roadmapActionJson: agentResponse.proposedRoadmapAction ? JSON.stringify(agentResponse.proposedRoadmapAction) : null,
      institutionId: tenantId,
    });

    return NextResponse.json({
      message: savedAgentMessage,
      agentResponse: {
        ...agentResponse,
        citations: combinedCitations,
      },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'curriculum:advising:chat');
