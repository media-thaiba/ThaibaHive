import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { liveSessionManager } from "@/lib/live/session-manager";
import { isLiveStreamingEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/live/sessions/[id]/stream
 * Server-Sent Events (SSE) duplex downstream feed for live transcripts, hazards, and status updates.
 * Authenticated via session cookie/header (no query-string tokens).
 */
export const GET = requireAuth(async (request: Request, session: any, context?: any) => {
  const institutionId = await resolveRequestInstitution(session);

  if (!institutionId) {
    return new Response(JSON.stringify({ error: "Institution context is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isLiveStreamingEnabled(institutionId)) {
    return new Response(JSON.stringify({ error: "Live streaming feature is disabled" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const params = await context?.params;
  const sessionId = params?.id;

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Session ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  if (request.signal?.aborted) {
    return new Response(new ReadableStream({ start(c) { c.close(); } }), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "close",
      },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      const cleanup = () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {}
      };

      if (request.signal?.aborted) {
        cleanup();
        return;
      }

      try {
        // Subscribe to live session events
        unsubscribe = liveSessionManager.subscribe(
          sessionId,
          institutionId,
          (event: string, data: any) => {
            try {
              const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
              controller.enqueue(encoder.encode(payload));
            } catch {
              cleanup();
            }
          }
        );

        // Send initial connected frame
        const initialFrame = `event: connected\ndata: ${JSON.stringify({
          sessionId,
          status: "connected",
          timestamp: Date.now(),
        })}\n\n`;
        controller.enqueue(encoder.encode(initialFrame));
      } catch (err: any) {
        const errorFrame = `event: error\ndata: ${JSON.stringify({
          error: err.message || "Failed to subscribe to live stream",
        })}\n\n`;
        controller.enqueue(encoder.encode(errorFrame));
        cleanup();
      }

      request.signal?.addEventListener("abort", () => {
        cleanup();
      });
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "close",
    },
  });
}, "live_stream:view");
