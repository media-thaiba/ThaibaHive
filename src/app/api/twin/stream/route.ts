import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SpatialStreamManager, SpatialStreamMessage } from '@/lib/operations/twin/streaming/spatial-stream-manager';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const facilityId = searchParams.get('facilityId') || 'all';

  const streamManager = SpatialStreamManager.getInstance();
  const subId = `sse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const encoder = new TextEncoder();
  let subRef: any = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ subId, facilityId })}\n\n`));

      const topic = facilityId === 'all' ? '*' : `facility:${facilityId}`;
      subRef = streamManager.registerSubscriber(subId, tenantId, [topic, 'emergency'], (msg: SpatialStreamMessage) => {
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
}, 'twin:facilities:read');
