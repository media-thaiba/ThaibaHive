import { requireAuth } from "@/lib/api/auth-guard";
import {
  registerSSEConnection,
  unregisterSSEConnection,
  type SSEConnection,
} from "@/lib/api/realtime";
import { db } from "@/db";
import { staffInstitutions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  // All presence subscribers share a single key for broadcasting
  const key = "presence";

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const writer = new WritableStream({
        write(chunk) {
          controller.enqueue(chunk);
        },
      }).getWriter();

      let instIds: string[] = [];
      try {
        const callerInsts = await db
          .select({ institutionId: staffInstitutions.institutionId })
          .from(staffInstitutions)
          .where(eq(staffInstitutions.staffId, session.staffId))
          .all();
        instIds = callerInsts.map((i) => i.institutionId).filter(Boolean);
      } catch (err) {
        console.error("Failed to query subscriber institutions in subscribe route:", err);
      }

      const conn: SSEConnection = { controller, writer, institutionIds: instIds };
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
}, "attendance:read");
