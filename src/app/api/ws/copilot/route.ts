import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { wsClientManager } from '@/lib/operations/km/streaming/ws-client-manager';
import { edgeWebSocketServer } from '@/lib/operations/km/streaming/edge-websocket-server';

export const runtime = 'edge';

export const GET = requireAuth(async (req: Request) => {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') || 'guest_user';
  const role = url.searchParams.get('role') || 'student';
  const institutionId = url.searchParams.get('institutionId') || 'global';

  // For HTTP/SSE fallback or healthcheck
  return NextResponse.json({
    status: 'ws_endpoint_ready',
    activeConnections: wsClientManager.getActiveConnectionsCount(),
    runtime: 'edge',
    userId,
    role,
    institutionId,
  });
}, 'km:knowledge:search');

export const POST = requireAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const connectionId = body.connectionId || `conn_${Date.now()}`;
    const rawMessage = JSON.stringify(body.message || body);

    await edgeWebSocketServer.handleMessage(connectionId, rawMessage);

    return NextResponse.json({ status: 'message_dispatched', connectionId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal WebSocket routing error' }, { status: 400 });
  }
}, 'km:knowledge:search');
