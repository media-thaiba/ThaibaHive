import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { AgentMessageBus } from "@/lib/agents/core/message-bus";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (req: Request, session: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId") || searchParams.get("institutionId"));

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return new Response(JSON.stringify({ error: "Agentic workflows feature is disabled" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const topicsParam = searchParams.get("topics") || "*";
  const topics = topicsParam.split(",").map((t) => t.trim()).filter(Boolean);

  const clientId = `agent_stream_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const messageBus = AgentMessageBus.getInstance();
  const encoder = new TextEncoder();
  let sequenceNumber = 0;
  let unsubscribeFn: (() => void) | null = null;

  if (req.signal?.aborted) {
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
      const sendEvent = (eventType: string, data: any) => {
        try {
          sequenceNumber++;
          const payload = {
            seq: sequenceNumber,
            timestamp: new Date().toISOString(),
            tenantId,
            type: eventType,
            data,
          };
          const frame = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(frame));
        } catch {
          cleanup();
        }
      };

      const cleanup = () => {
        if (unsubscribeFn) {
          unsubscribeFn();
          unsubscribeFn = null;
        }
        try {
          controller.close();
        } catch {}
      };

      if (req.signal?.aborted) {
        cleanup();
        return;
      }

      // Initial connected frame
      sendEvent("connected", { clientId, tenantId, topics });

      // Subscribe to agent bus events
      const handler = (message: any) => {
        if (message.institutionId === tenantId || tenantId === "global") {
          sendEvent(message.topic, message.payload);
        }
      };
      messageBus.subscribe("*", handler);
      unsubscribeFn = () => {
        messageBus.unsubscribe("*", handler);
      };

      // Heartbeat ping interval to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          sendEvent("heartbeat", { status: "alive", uptime: process.uptime() });
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      req.signal?.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        cleanup();
      });
    },
    cancel() {
      if (unsubscribeFn) {
        unsubscribeFn();
        unsubscribeFn = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}, "agent:telemetry:view");
