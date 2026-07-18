import { requireAuth } from "@/lib/api/auth-guard";
import {
  registerSSEConnection,
  unregisterSSEConnection,
  onNotificationConnect,
  onNotificationDisconnect,
  broadcastPresence,
  type SSEConnection,
} from "@/lib/api/realtime";
import { db } from "@/db";
import { presence } from "@thaiba/db/schema";

export const GET = requireAuth(async (_request, session) => {
  const key = `notification-${session.staffId}`;

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

      // Presence: mark online on connect
      onNotificationConnect(session.staffId);
      const now = new Date().toISOString();
      db.insert(presence)
        .values({
          staffId: session.staffId,
          online: true,
          lastSeenAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: presence.staffId,
          set: { online: true, lastSeenAt: now, updatedAt: now },
        })
        .returning()
        .execute()
        .then((rows) => {
          const row = rows[0];
          broadcastPresence(
            session.staffId,
            true,
            now,
            row?.status ?? "active",
            row?.statusText ?? null
          );
        })
        .catch((err) => {
          console.error("Failed to mark presence online on connection:", err);
        });

      // Send initial connected event
      const connected = `event: connected\ndata: ${JSON.stringify({ staffId: session.staffId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connected));

      // 30s keep-alive ping
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
        // Presence: debounce offline on disconnect
        onNotificationDisconnect(session.staffId);
      };
    },
  });

  // Abort handler — cleanup is set synchronously by start()
  _request.signal.addEventListener("abort", () => {
    cleanup?.();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    },
  });
}, "notifications:update");
