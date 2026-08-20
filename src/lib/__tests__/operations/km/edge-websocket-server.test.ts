import { edgeWebSocketServer } from '@/lib/operations/km/streaming/edge-websocket-server';
import { wsClientManager } from '@/lib/operations/km/streaming/ws-client-manager';

describe('Edge WebSocket Server (KM-014 / TD-046-02 Resolution)', () => {
  const connectionId = 'conn_test_001';
  const sentMessages: string[] = [];

  beforeEach(() => {
    sentMessages.length = 0;
    wsClientManager.clear();

    wsClientManager.registerClient({
      connectionId,
      userId: 'user_std_001',
      role: 'student',
      institutionId: 'inst_main',
      connectedAt: Date.now(),
      lastPingAt: Date.now(),
      channels: new Set(['general_announcements']),
      send: (msg: string) => {
        sentMessages.push(msg);
      },
    });
  });

  it('should handle ping and return pong', async () => {
    await edgeWebSocketServer.handleMessage(connectionId, JSON.stringify({ type: 'ping' }));
    expect(sentMessages.length).toBe(1);
    const parsed = JSON.parse(sentMessages[0]);
    expect(parsed.type).toBe('pong');
  });

  it('should stream tokens and complete response for query message', async () => {
    await edgeWebSocketServer.handleMessage(
      connectionId,
      JSON.stringify({
        type: 'query',
        sessionId: 'sesh_ws_test',
        text: 'What are the prerequisites for CS-102?',
      })
    );

    expect(sentMessages.length).toBeGreaterThan(2);
    const startMsg = JSON.parse(sentMessages[0]);
    expect(startMsg.type).toBe('token_stream_start');

    const completedMsg = JSON.parse(sentMessages[sentMessages.length - 1]);
    expect(completedMsg.type).toBe('response_complete');
    expect(completedMsg.payload.answerText).toBeDefined();
  });

  it('should broadcast messages to subscribed channel clients', () => {
    const broadcastCount = wsClientManager.broadcastToChannel('general_announcements', {
      type: 'toast_alert',
      message: 'Campus closes at 9 PM today.',
    });

    expect(broadcastCount).toBe(1);
    expect(sentMessages.length).toBe(1);
    expect(JSON.parse(sentMessages[0]).type).toBe('toast_alert');
  });
});
