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

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connected frame
  const initialFrame = `data: ${JSON.stringify({ type: 'connected', clientId, tenantId, topics })}\n\n`;
  await writer.write(encoder.encode(initialFrame));

  streamManager.subscribe(clientId, tenantId, topics, (topic, data) => {
    const payload = `event: ${topic}\ndata: ${JSON.stringify(data)}\n\n`;
    writer.write(encoder.encode(payload)).catch(() => {
      streamManager.unsubscribe(clientId);
    });
  });

  req.signal?.addEventListener('abort', () => {
    streamManager.unsubscribe(clientId);
    writer.close().catch(() => {});
  });

  return new NextResponse(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}, 'vision:alerts:view');
