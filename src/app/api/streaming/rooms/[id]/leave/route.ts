import { NextResponse } from 'next/server';
import { requireAuth, resolveRequestInstitution } from '@/lib/api/auth-guard';
import { isWebRtcConferencingEnabled } from '@/lib/features';
import { roomManager } from '@/lib/streaming/room-manager';
import { db } from '@/db';
import { streamingSessions, streamingRooms } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const POST = requireAuth(async (request, session, context) => {
  const url = new URL(request.url);
  const params = context ? await context.params : {};
  const roomId = params.id;
  if (!roomId) {
    return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
  }

  let institutionId = await resolveRequestInstitution(session, url.searchParams.get('institutionId'));
  if (institutionId === 'global') {
    const [existing] = await db
      .select({ institutionId: streamingRooms.institutionId })
      .from(streamingRooms)
      .where(eq(streamingRooms.id, roomId));
    if (existing?.institutionId) {
      institutionId = existing.institutionId;
    }
  }

  if (!institutionId || institutionId === 'global') {
    return NextResponse.json({ error: 'Institution context required' }, { status: 400 });
  }

  if (!isWebRtcConferencingEnabled(institutionId)) {
    return NextResponse.json({ error: 'WebRTC conferencing is disabled for this institution' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  // QA-07: Lookup caller's active session in the room
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

  if (!active) {
    return NextResponse.json({ error: 'Caller does not have an active session in this room' }, { status: 404 });
  }

  // Reject attempt to evict another peer
  if (body.peerId && body.peerId !== active.peerId) {
    return NextResponse.json({ error: 'Forbidden: Cannot evict other participants via leave endpoint' }, { status: 403 });
  }

  if (!active.peerId) {
    return NextResponse.json({ error: 'Active session does not have an assigned peerId' }, { status: 400 });
  }

  await roomManager.leaveRoom(institutionId, roomId, active.peerId);

  return NextResponse.json({ success: true, message: 'Left conference room' });
}, 'conference:join');
