import { NextResponse } from 'next/server';
import { requireAuth, resolveRequestInstitution } from '@/lib/api/auth-guard';
import { isWebRtcConferencingEnabled } from '@/lib/features';
import { roomManager } from '@/lib/streaming/room-manager';
import { db } from '@/db';
import { streamingSessions } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const POST = requireAuth(async (request, session, context) => {
  const url = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, url.searchParams.get('institutionId'));

  if (!isWebRtcConferencingEnabled(institutionId)) {
    return NextResponse.json({ error: 'WebRTC conferencing is disabled for this institution' }, { status: 403 });
  }

  const params = context ? await context.params : {};
  const roomId = params.id;
  if (!roomId) {
    return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  let peerId = body.peerId;

  if (!peerId) {
    // Lookup active session for participant
    const [active] = await db
      .select()
      .from(streamingSessions)
      .where(
        and(
          eq(streamingSessions.institutionId, institutionId),
          eq(streamingSessions.roomId, roomId),
          eq(streamingSessions.participantUserId, session.staffId),
          isNull(streamingSessions.leftAt)
        )
      );
    peerId = active?.peerId;
  }

  if (peerId) {
    await roomManager.leaveRoom(institutionId, roomId, peerId);
  }

  return NextResponse.json({ success: true, message: 'Left conference room' });
}, 'conference:join');
