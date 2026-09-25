import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { alumniEventEngine } from '@/lib/operations/alumni/events/alumni-event-engine';
import { checkInAttendeeSchema } from '@/lib/validation/alumni-schemas';

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = checkInAttendeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const result = await alumniEventEngine.checkInAttendee({
      eventId: parsed.data.eventId,
      ticketPassHash: parsed.data.ticketPassHash,
      checkedInById: session.staffId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Check-in failed' }, { status: 400 });
  }
}, 'alumni:events:checkin');
