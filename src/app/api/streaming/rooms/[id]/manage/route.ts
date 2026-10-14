import { NextResponse } from 'next/server';
import { requireAuth, resolveRequestInstitution } from '@/lib/api/auth-guard';
import { isWebRtcConferencingEnabled } from '@/lib/features';
import { roomManager } from '@/lib/streaming/room-manager';
import { conferenceManageSchema } from '@/lib/validation/schemas';

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
  const parsed = conferenceManageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await roomManager.moderateRoom(
      institutionId,
      roomId,
      session.staffId,
      parsed.data
    );
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: err.message || 'Failed to moderate room' }, { status });
  }
}, 'conference:manage');
