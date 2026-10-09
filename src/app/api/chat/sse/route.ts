import { requireAuth } from "@/lib/api/auth-guard";
import { chatPubSub, ChatSubscriber, ChatEvent } from "@/lib/chat/pubsub-broker";
import { chatPresence } from "@/lib/chat/presence-engine";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (request: Request, session) => {
  const encoder = new TextEncoder();
  const staffId = session.staffId;
  const institutionId = session.institutionId || "";

  let subscriber: ChatSubscriber | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      subscriber = {
        staffId,
        institutionId,
        isAlive: true,
        send(event: ChatEvent) {
          try {
            const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          } catch (err) {
            console.error(`[ChatSSE] Error enqueueing event for ${staffId}:`, err);
          }
        },
      };

      chatPubSub.registerUserConnection(subscriber);
      chatPresence.recordHeartbeat(staffId, institutionId, "online");

      // Send initial connected handshake
      const initialFrame = `event: connected\ndata: ${JSON.stringify({
        status: "connected",
        staffId,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initialFrame));

      // 30s heartbeat interval
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
          chatPresence.recordHeartbeat(staffId, institutionId, "online");
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      }, 30_000);
    },
    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (subscriber) {
        chatPubSub.unregisterUserConnection(subscriber);
        if (!chatPubSub.isUserOnline(staffId)) {
          chatPresence.setUserOffline(staffId, institutionId);
        }
      }
    },
  });

  request.signal.addEventListener("abort", () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (subscriber) {
      chatPubSub.unregisterUserConnection(subscriber);
      if (!chatPubSub.isUserOnline(staffId)) {
        chatPresence.setUserOffline(staffId, institutionId);
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}, "chat:messages:read");
