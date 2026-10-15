import { NextResponse } from 'next/server';
import { requireAuth, resolveRequestInstitution } from '@/lib/api/auth-guard';
import { isWebRtcConferencingEnabled } from '@/lib/features';
import { roomManager } from '@/lib/streaming/room-manager';
import { conferenceJoinSchema } from '@/lib/validation/schemas';
import { db } from '@/db';
import { streamingRooms } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
  const parsed = conferenceJoinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  try {
    const role = (session.role === 'admin' || session.role === 'super_admin' || session.role === 'principal') ? 'HOST' : 'ATTENDEE';
    const result = await roomManager.joinRoom(
      institutionId,
      roomId,
      session.staffId,
      parsed.data,
      undefined,
      role
    );

    return NextResponse.json({
      success: true,
      roomId,
      session: result.session,
      epoch: result.epoch,
      fingerprint: result.fingerprint,
    });
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 :
      err.message.includes('passcode') ? 401 :
      err.message.includes('capacity') ? 409 : 400;

    return NextResponse.json({ error: err.message || 'Failed to join room' }, { status });
  }
}, 'conference:join');
