import { NextResponse } from 'next/server';
import { requireAuth, resolveRequestInstitution } from '@/lib/api/auth-guard';
import { isWebRtcConferencingEnabled } from '@/lib/features';
import { roomManager } from '@/lib/streaming/room-manager';
import { signalingManager } from '@/lib/streaming/webrtc-signaling';
import { db } from '@/db';
import { streamingSessions } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const GET = requireAuth(async (request, session, context) => {
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

  const room = await roomManager.getRoom(institutionId, roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // Active participants
  const activeSessions = await db
    .select()
    .from(streamingSessions)
    .where(
      and(
        eq(streamingSessions.institutionId, institutionId),
        eq(streamingSessions.roomId, roomId),
        isNull(streamingSessions.leftAt)
      )
    );

  const turnCredentials = signalingManager.generateTurnCredentials(session.staffId);
  const currentEpoch = roomManager.getRoomEpoch(roomId);

  return NextResponse.json({
    success: true,
    room,
    activeSessions,
    iceServers: signalingManager.getIceServers(),
    turnCredentials,
    currentEpoch,
  });
}, 'conference:join');
