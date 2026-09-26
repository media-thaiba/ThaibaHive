import { requireAuth } from '@/lib/api/auth-guard';
import { VisionStreamManager } from '@/lib/operations/vision/streaming/vision-stream-manager';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const topicsParam = searchParams.get('topics') || '*';
  const topics = topicsParam.split(',').map((t) => t.trim()).filter(Boolean);

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const streamManager = VisionStreamManager.getInstance();
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  if (req.signal?.aborted) {
    return new Response(new ReadableStream({ start(c) { c.close(); } }), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'close',
      },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      cleanup = () => {
        streamManager.unsubscribe(clientId);
        try {
          controller.close();
        } catch {}
      };

      if (req.signal?.aborted) {
        cleanup();
        cleanup = null;
        return;
      }

      // Send initial connected frame
      const initialFrame = `data: ${JSON.stringify({ type: 'connected', clientId, tenantId, topics })}\n\n`;
      controller.enqueue(encoder.encode(initialFrame));

      streamManager.subscribe(clientId, tenantId, topics, (topic, data) => {
        try {
          const payload = `event: ${topic}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          streamManager.unsubscribe(clientId);
        }
      });

      req.signal?.addEventListener('abort', () => {
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
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}, 'vision:alerts:view');
