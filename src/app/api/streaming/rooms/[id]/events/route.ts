import { requireAuth, resolveRequestInstitution } from '@/lib/api/auth-guard';
import { isWebRtcConferencingEnabled } from '@/lib/features';
import { signalingManager } from '@/lib/streaming/webrtc-signaling';
import { db } from '@/db';
import { streamingSessions, streamingRooms } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (request, session, context) => {
  const url = new URL(request.url);
  const params = context ? await context.params : {};
  const roomId = params.id;
  if (!roomId) {
    return new Response(JSON.stringify({ error: 'Room ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
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
    return new Response(JSON.stringify({ error: 'Institution context required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isWebRtcConferencingEnabled(institutionId)) {
    return new Response(JSON.stringify({ error: 'WebRTC conferencing is disabled for this institution' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // QA-05: Authenticate room membership — caller must have an active session in the room
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
    return new Response(JSON.stringify({ error: 'Caller does not have an active session in this room' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const requestedPeerId = url.searchParams.get('peerId');
  if (requestedPeerId && requestedPeerId !== activeSession.peerId) {
    return new Response(JSON.stringify({ error: 'Forbidden: Cannot access signal stream for another peer' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!activeSession.peerId) {
    return new Response(JSON.stringify({ error: 'Active session does not have an assigned peerId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Derive peerId strictly from caller's active session
  const peerId = activeSession.peerId;

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Send initial connected event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ peerId, roomId, timestamp: Date.now() })}\n\n`)
      );

      // 2. Fetch and enqueue pending undelivered signals
      try {
        const pending = await signalingManager.getPendingSignals(institutionId, roomId, peerId);
        if (pending.length > 0) {
          for (const sig of pending) {
            controller.enqueue(encoder.encode(`event: signal\ndata: ${JSON.stringify(sig)}\n\n`));
          }
          await signalingManager.markSignalsDelivered(pending.map((s) => s.id));
        }
      } catch {
        // Suppress pending fetch errors
      }

      // 3. Subscribe to real-time signals
      unsubscribe = signalingManager.subscribe(roomId, peerId, async (signal) => {
        try {
          controller.enqueue(encoder.encode(`event: signal\ndata: ${JSON.stringify(signal)}\n\n`));
          await signalingManager.markSignalsDelivered([signal.id]).catch(() => {});
        } catch {
          // Stream might be closed
        }
      });

      // 4. Heartbeat keep-alive every 15s
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      }, 15000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform, private, no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}, 'conference:join');
