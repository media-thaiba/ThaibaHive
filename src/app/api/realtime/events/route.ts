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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", staffId: session.staffId })}\n\n`)
      );

      // Poll for tokenVersion changes every 5 seconds
      const checkInterval = setInterval(async () => {
        try {
          const user = await db
            .select({ tokenVersion: staff.tokenVersion, isActive: staff.isActive })
            .from(staff)
            .where(eq(staff.id, session.staffId))
            .get();

          if (!user || !user.isActive) {
            // Account deactivated
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "account_deactivated" })}\n\n`)
            );
            clearInterval(checkInterval);
            controller.close();
            return;
          }

          if (user.tokenVersion !== session.tokenVersion) {
            // Token version changed - session invalidated
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "session_invalidated" })}\n\n`)
            );
            clearInterval(checkInterval);
            controller.close();
            return;
          }
        } catch {
          // Ignore errors, keep polling
        }
      }, 5_000);

      // Clean up on connection close
      request.signal.addEventListener("abort", () => {
        clearInterval(checkInterval);
        controller.close();
      });
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
