import { requireAuth } from '@/lib/api/auth-guard';
import { advisingStream } from '@/lib/operations/curriculum/streaming/advising-stream-manager';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const institutionId = searchParams.get('institutionId') || user?.institutionId || 'global';

  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`)
      );

      const handleMessage = (msg: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        } catch {}
      };

      let unsubscribeSession: (() => void) | undefined;
      if (sessionId) {
        unsubscribeSession = advisingStream.subscribeSession(sessionId, handleMessage);
      }
      const unsubscribeInst = advisingStream.subscribeInstitution(institutionId, handleMessage);

      // Heartbeat interval to prevent socket timeout
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        if (unsubscribeSession) unsubscribeSession();
        if (unsubscribeInst) unsubscribeInst();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}, 'curriculum:advising:chat');
