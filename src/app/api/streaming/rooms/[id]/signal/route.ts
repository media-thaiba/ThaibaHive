import { NextResponse } from 'next/server';
import { requireAuth, resolveRequestInstitution } from '@/lib/api/auth-guard';
import { isWebRtcConferencingEnabled } from '@/lib/features';
import { signalingManager } from '@/lib/streaming/webrtc-signaling';
import { checkDistributedRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { conferenceSignalSchema } from '@/lib/validation/schemas';
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

  // QA-06: Verify caller active session in room
  const [activeSession] = await db
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

  if (!activeSession) {
    return NextResponse.json({ error: 'Caller does not have an active session in this room' }, { status: 403 });
  }

  if (!activeSession.peerId) {
    return NextResponse.json({ error: 'Active session does not have an assigned peerId' }, { status: 400 });
  }

  const senderPeerId = activeSession.peerId;

  // Rate limit signal dispatch per peer
  const rl = await checkDistributedRateLimit(`streaming:signal:${senderPeerId}`, 'general');
  if (!rl.allowed) {
    return rateLimitResponse(rl.resetMs);
  }

  const body = await request.json().catch(() => ({}));

  // Validate payload with conferenceSignalSchema
  const rawPayload = typeof body.payloadJson === 'string'
    ? body.payloadJson
    : JSON.stringify(body.payloadJson || body.payload || (body.sdp || body.candidate ? { sdp: body.sdp, candidate: body.candidate } : {}));

  const parsed = conferenceSignalSchema.safeParse({
    targetPeerId: body.targetPeerId || body.recipientPeerId || '*',
    signalType: body.signalType || body.type,
    payloadJson: rawPayload,
    sequenceNum: body.sequenceNum ?? 1,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  const signal = await signalingManager.dispatchSignal({
    institutionId,
    roomId,
    senderPeerId,
    recipientPeerId: parsed.data.targetPeerId,
    signalType: parsed.data.signalType,
    payloadJson: parsed.data.payloadJson,
    sequenceNum: parsed.data.sequenceNum,
  });

  return NextResponse.json({
    success: true,
    signal,
    iceServers: signalingManager.getIceServers(),
  });
}, 'conference:join');
