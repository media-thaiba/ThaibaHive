import { requireAuth } from "@/lib/api/auth-guard";
import {
  registerSSEConnection,
  unregisterSSEConnection,
  type SSEConnection,
} from "@/lib/api/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = requireAuth(async (request, session) => {
  if (request.signal?.aborted) {
    return new Response(new ReadableStream({ start(c) { c.close(); } }), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store",
        Connection: "close",
      },
    });
  }

  const key = `workspace-${session.staffId}`;

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const writer = new WritableStream({
        write(chunk) {
          controller.enqueue(chunk);
        },
      }).getWriter();

      const conn: SSEConnection = { controller, writer };

      cleanup = () => {
        clearInterval(pingInterval);
        unregisterSSEConnection(key, conn);
        try {
          controller.close();
        } catch {
          // Ignore close errors
        }
      };

      if (request.signal?.aborted) {
        unregisterSSEConnection(key, conn);
        try {
          controller.close();
        } catch {}
        cleanup = null;
        return;
      }

      registerSSEConnection(key, conn);

      // Initial connected event
      const connected = `event: connected\ndata: ${JSON.stringify({
        staffId: session.staffId,
        role: session.role,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connected));

      const heartbeatMs = Number(process.env.SSE_HEARTBEAT_INTERVAL_MS) || 5_000;
      // Heartbeat ping to prevent mobile carrier connection drops
      const pingInterval = setInterval(() => {
        try {
          writer.write(new TextEncoder().encode(": ping\n\n"));
        } catch {
          clearInterval(pingInterval);
        }
      }, heartbeatMs);

      // Abort signal cleanup (Rule 82 — unregister on unmount)
      request.signal?.addEventListener("abort", () => {
        cleanup?.();
        cleanup = null;
      });
    },
    cancel() {
      cleanup?.();
      cleanup = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}, "workspaces:read");
