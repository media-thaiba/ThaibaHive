import { verifySession } from "@/lib/auth";
import { db } from "@/db";
import { staff } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await verifySession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (request.signal?.aborted) {
    return new Response(new ReadableStream({ start(c) { c.close(); } }), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "close",
      },
    });
  }

  const encoder = new TextEncoder();
  let streamCleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const staffId = session.staffId;
      const currentTokenVersion = session.tokenVersion;
      let polling = true;
      let pollTimer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        polling = false;
        if (pollTimer) {
          clearTimeout(pollTimer);
          pollTimer = null;
        }
        try {
          controller.close();
        } catch {}
      };

      streamCleanup = cleanup;

      if (request.signal?.aborted) {
        cleanup();
        return;
      }

      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", staffId })}\n\n`)
      );

      async function pollTokenVersion() {
        if (!polling) return;
        try {
          const user = await db
            .select({ tokenVersion: staff.tokenVersion, isActive: staff.isActive })
            .from(staff)
            .where(eq(staff.id, staffId))
            .get();

          if (!user || !user.isActive) {
            cleanup();
            return;
          }

          if (user.tokenVersion !== currentTokenVersion) {
            cleanup();
            return;
          }
        } catch {
          // Ignore errors, keep polling
        }
        if (polling) {
          pollTimer = setTimeout(pollTokenVersion, 5_000);
        }
      }

      pollTokenVersion();

      // Clean up on connection close
      request.signal?.addEventListener("abort", () => {
        cleanup();
      });
    },
    cancel() {
      streamCleanup?.();
      streamCleanup = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
