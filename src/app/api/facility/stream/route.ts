import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { facilityStreamManager } from '@/lib/operations/facility/streaming/facility-stream-manager';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection packet
      const initPayload = JSON.stringify({
        type: 'connection_established',
        timestamp: new Date().toISOString(),
        institutionId: tenantId,
      });
      controller.enqueue(encoder.encode(`data: ${initPayload}\n\n`));

      const unsubscribe = facilityStreamManager.subscribe(tenantId, (event) => {
        try {
          const chunk = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Stream closed
        }
      });

      if (req?.signal?.addEventListener) {
        req.signal.addEventListener('abort', () => {
          unsubscribe();
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}, 'facility:equipment:view');
