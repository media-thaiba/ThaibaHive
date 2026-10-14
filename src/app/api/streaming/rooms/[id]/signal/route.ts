import { NextResponse } from 'next/server';
import { requireAuth, resolveRequestInstitution } from '@/lib/api/auth-guard';
import { isWebRtcConferencingEnabled } from '@/lib/features';
import { signalingManager } from '@/lib/streaming/webrtc-signaling';

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

  // Support both Phase 12 schema and legacy structure
  const senderPeerId = body.senderPeerId || session.staffId;
  const targetPeerId = body.targetPeerId || body.recipientPeerId || '*';
  const signalType = body.signalType || body.type;
  const payloadJson = body.payloadJson || JSON.stringify(body.payload || { sdp: body.sdp, candidate: body.candidate });
  const sequenceNum = body.sequenceNum || 1;

  if (!signalType) {
    return NextResponse.json({ error: 'signalType is required' }, { status: 400 });
  }

  const signal = await signalingManager.dispatchSignal({
    institutionId,
    roomId,
    senderPeerId,
    recipientPeerId: targetPeerId,
    signalType,
    payloadJson,
    sequenceNum,
  });

  return NextResponse.json({
    success: true,
    signal,
    iceServers: signalingManager.getIceServers(),
  });
}, 'conference:join');
