import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { alumniEventEngine } from '@/lib/operations/alumni/events/alumni-event-engine';
import { alumniStore } from '@/db/alumni-store';
import { createEventSchema, registerEventRsvpSchema } from '@/lib/validation/alumni-schemas';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const chapterId = url.searchParams.get('chapterId') || undefined;
  const eventId = url.searchParams.get('id');

  if (eventId) {
    const event = await alumniStore.getEventById(eventId, institutionId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, event });
  }

  const list = await alumniStore.listEvents({ institutionId, chapterId });
  return NextResponse.json({ success: true, events: list });
}, 'alumni:events:view');

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const event = await alumniEventEngine.createEvent({
      ...parsed.data,
      organizerAlumniId: parsed.data.organizerAlumniId || session.staffId,
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Event creation failed' }, { status: 500 });
  }
}, 'alumni:events:manage');

export const PUT = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = registerEventRsvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const rsvp = await alumniEventEngine.registerRsvp({
      ...parsed.data,
      alumniProfileId: parsed.data.alumniProfileId || (session.role === 'alumni' ? session.staffId : undefined),
      studentId: parsed.data.studentId || (session.role === 'student' ? session.staffId : undefined),
    });

    return NextResponse.json({ success: true, rsvp }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'RSVP registration failed' }, { status: 500 });
  }
}, 'alumni:events:rsvp');
