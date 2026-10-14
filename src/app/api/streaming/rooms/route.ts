import { NextResponse } from 'next/server';
import { requireAuth, resolveRequestInstitution } from '@/lib/api/auth-guard';
import { isWebRtcConferencingEnabled } from '@/lib/features';
import { roomManager } from '@/lib/streaming/room-manager';
import { conferenceRoomCreateSchema } from '@/lib/validation/schemas';

export const GET = requireAuth(async (request, session) => {
  const url = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, url.searchParams.get('institutionId'));

  if (!isWebRtcConferencingEnabled(institutionId)) {
    return NextResponse.json({ error: 'WebRTC conferencing is disabled for this institution' }, { status: 403 });
  }

  const rooms = await roomManager.listRooms(institutionId);
  return NextResponse.json({ success: true, rooms });
}, 'conference:join');

export const POST = requireAuth(async (request, session) => {
  const body = await request.json().catch(() => null);
  const parsed = conferenceRoomCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  const url = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, url.searchParams.get('institutionId'));

  if (!isWebRtcConferencingEnabled(institutionId)) {
    return NextResponse.json({ error: 'WebRTC conferencing is disabled for this institution' }, { status: 403 });
  }

  const room = await roomManager.createRoom(institutionId, session.staffId, parsed.data);
  return NextResponse.json({ success: true, room }, { status: 201 });
}, 'conference:create');
