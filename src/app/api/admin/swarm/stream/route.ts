import { requireAuth } from "@/lib/auth/require-auth";
import { SSEManager } from "@/lib/observability/sse-manager";
import { createGzipFlushStream } from "@/lib/observability/compression";

async function handler(req: Request) {
  const sseManager = SSEManager.getInstance();

  const acceptEncoding = req.headers.get("accept-encoding") || "";
  const supportsGzip = acceptEncoding.includes("gzip");

  let activeController: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      activeController = controller;
      const success = sseManager.registerConnection(controller);
      if (!success) {
        return;
      }
    },
    cancel() {
      if (activeController) {
        sseManager.removeConnection(activeController);
      }
    }
  });

  let responseStream: ReadableStream = stream;
  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive"
  };

  // Support gzip compression transparently using our custom real-time flushing stream
  if (supportsGzip) {
    headers["Content-Encoding"] = "gzip";
    responseStream = stream.pipeThrough(createGzipFlushStream());
  }

  return new Response(responseStream, { headers });
}

// Gated behind the 'observability:read' permission
export const GET = requireAuth(handler, "observability:read");
