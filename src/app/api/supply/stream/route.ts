import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyStreamManager } from '@/lib/operations/supply/streaming/supply-stream-manager';

export const dynamic = 'force-dynamic';

const streamManager = SupplyStreamManager.getInstance();

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const institutionId = searchParams.get('institutionId') || user?.institutionId || 'global';
  const topic = searchParams.get('topic') || 'orders:status';

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ institutionId, topic, connectedAt: new Date().toISOString() })}\n\n`
        )
      );

      const unsubscribe = streamManager.subscribe(topic, institutionId, (event) => {
        controller.enqueue(
          encoder.encode(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`)
        );
      });

      req.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}, 'supply:stream:view');
