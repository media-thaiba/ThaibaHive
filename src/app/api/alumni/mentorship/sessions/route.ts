import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { mentorshipSessionEngine } from '@/lib/operations/alumni/mentorship/mentorship-session-engine';
import { createMentorshipRequestSchema } from '@/lib/validation/alumni-schemas';

export const POST = requireAuth(async (request) => {
  try {
    const body = await request.json();
    const action = body.action || 'request';

    if (action === 'request') {
      const parsed = createMentorshipRequestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
      }
      const req = await mentorshipSessionEngine.submitMentorshipRequest(parsed.data);
      return NextResponse.json({ success: true, request: req }, { status: 201 });
    }

    if (action === 'respond') {
      const { requestId, response, responseNotes } = body;
      if (!requestId || !response) {
        return NextResponse.json({ error: 'requestId and response required' }, { status: 400 });
      }
      const updated = await mentorshipSessionEngine.respondToRequest(requestId, response, responseNotes);
      return NextResponse.json({ success: true, request: updated });
    }

    if (action === 'schedule') {
      const { requestId, scheduledStart, scheduledEnd, meetingUrl } = body;
      if (!requestId || !scheduledStart || !scheduledEnd) {
        return NextResponse.json({ error: 'requestId, scheduledStart and scheduledEnd required' }, { status: 400 });
      }
      const session = await mentorshipSessionEngine.scheduleSession({
        requestId,
        scheduledStart,
        scheduledEnd,
        meetingUrl,
      });
      return NextResponse.json({ success: true, session }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}, 'alumni:mentorship:manage');

export const PATCH = requireAuth(async (request) => {
  try {
    const body = await request.json();
    const { sessionId, actorRole, rating, feedback, sessionNotes } = body;

    if (!sessionId || !actorRole || !rating || !feedback) {
      return NextResponse.json({ error: 'sessionId, actorRole, rating and feedback required' }, { status: 400 });
    }

    const updatedSession = await mentorshipSessionEngine.submitSessionFeedback({
      sessionId,
      actorRole,
      rating,
      feedback,
      sessionNotes,
    });

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Feedback submission failed' }, { status: 500 });
  }
}, 'alumni:mentorship:manage');
