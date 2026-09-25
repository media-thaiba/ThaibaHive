import { NextResponse } from 'next/server';
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

  const stream = new ReadableStream({
    start(controller) {
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

      cleanup = () => {
        streamManager.unsubscribe(clientId);
        try {
          controller.close();
        } catch {}
      };

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

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}, 'vision:alerts:view');
