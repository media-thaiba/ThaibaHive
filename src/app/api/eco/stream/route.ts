import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { EnergyStreamManager, EnergyStreamMessage } from '@/lib/operations/eco/streaming/energy-stream-manager';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const topicParam = searchParams.get('topic') || 'grid:live';

  const streamManager = EnergyStreamManager.getInstance();
  const subId = `sse_eco_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const encoder = new TextEncoder();
  let subRef: any = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ subId, topic: topicParam })}\n\n`));

      const topics = topicParam === 'all' ? ['*'] : [topicParam, 'grid:live', 'power_quality_alert'];
      subRef = streamManager.registerSubscriber(subId, tenantId, topics, (msg: EnergyStreamMessage) => {
        try {
          const payload = `event: ${msg.type}\ndata: ${JSON.stringify(msg)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Client disconnected
        }
      });
    },
    cancel() {
      if (subRef) {
        streamManager.unregisterSubscriber(subId);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}, 'eco:carbon:view');
