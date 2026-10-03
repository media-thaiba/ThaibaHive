import { requireAuth } from "@/lib/api/auth-guard";
import {
  registerSSEConnection,
  unregisterSSEConnection,
  type SSEConnection,
} from "@/lib/api/realtime";

export const GET = requireAuth(async (request: Request, session) => {
  const key = `chat-${session.staffId}`;

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const writer = new WritableStream({
        write(chunk) {
          controller.enqueue(chunk);
        },
      }).getWriter();

      const conn: SSEConnection = { controller, writer };
      registerSSEConnection(key, conn);

      const connected = `event: connected\ndata: ${JSON.stringify({ staffId: session.staffId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connected));

      const pingInterval = setInterval(() => {
        try {
          writer.write(new TextEncoder().encode(": ping\n\n"));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30_000);

      cleanup = () => {
        clearInterval(pingInterval);
        unregisterSSEConnection(key, conn);
      };
    },
  });

  request.signal.addEventListener("abort", () => {
    cleanup?.();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    },
  });
}, "chat:read");
