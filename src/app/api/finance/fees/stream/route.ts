import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { FeeTelemetryManager } from '@/lib/operations/finance/telemetry/fee-metrics';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const institutionId = searchParams.get('institutionId') || user?.institutionId || 'global';

  const telemetryManager = FeeTelemetryManager.getInstance();
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Initial connection frame
  const initialFrame = `data: ${JSON.stringify({ type: 'connected', institutionId, timestamp: new Date().toISOString() })}\n\n`;
  await writer.write(encoder.encode(initialFrame));

  const unsubscribe = telemetryManager.subscribe((event) => {
    if (event.institutionId === institutionId || event.institutionId === 'global') {
      const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
      writer.write(encoder.encode(payload)).catch(() => {
        unsubscribe();
      });
    }
  });

  req.signal?.addEventListener('abort', () => {
    unsubscribe();
    writer.close().catch(() => {});
  });

  return new NextResponse(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}, 'finance:fees:view');
