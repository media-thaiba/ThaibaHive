import { requireAuth, resolveRequestInstitution } from '@/lib/api/auth-guard';
import { isWebRtcConferencingEnabled } from '@/lib/features';
import { signalingManager } from '@/lib/streaming/webrtc-signaling';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (request, session, context) => {
  const url = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, url.searchParams.get('institutionId'));

  if (!isWebRtcConferencingEnabled(institutionId)) {
    return new Response(JSON.stringify({ error: 'WebRTC conferencing is disabled for this institution' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const params = context ? await context.params : {};
  const roomId = params.id;
  if (!roomId) {
    return new Response(JSON.stringify({ error: 'Room ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const peerId = url.searchParams.get('peerId') || session.staffId;

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
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}, 'conference:join');
