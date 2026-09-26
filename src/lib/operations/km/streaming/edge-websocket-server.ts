import { wsClientManager } from './ws-client-manager';
import { agentOrchestrator } from '../conversational/agent-orchestrator';

export interface WSMessagePayload {
  type: 'query' | 'ping' | 'subscribe' | 'unsubscribe' | 'counselor_message';
  sessionId?: string;
  channel?: string;
  text?: string;
  data?: Record<string, any>;
}

export class EdgeWebSocketServer {
  private static instance: EdgeWebSocketServer;

  public static getInstance(): EdgeWebSocketServer {
    if (!EdgeWebSocketServer.instance) {
      EdgeWebSocketServer.instance = new EdgeWebSocketServer();
    }
    return EdgeWebSocketServer.instance;
  }

  /**
   * Handles incoming WebSocket messages, streams tokens, and routes channel subscriptions.
   */
  public async handleMessage(connectionId: string, rawMessage: string): Promise<void> {
    const client = wsClientManager.getClient(connectionId);
    if (!client) return;

    let payload: WSMessagePayload;
    try {
      payload = JSON.parse(rawMessage);
    } catch {
      client.send(JSON.stringify({ type: 'error', message: 'Invalid JSON message payload' }));
      return;
    }

    switch (payload.type) {
      case 'ping':
        client.lastPingAt = Date.now();
        client.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      case 'subscribe':
        if (payload.channel) {
          client.channels.add(payload.channel);
          client.send(JSON.stringify({ type: 'subscribed', channel: payload.channel }));
        }
        break;

      case 'unsubscribe':
        if (payload.channel) {
          client.channels.delete(payload.channel);
          client.send(JSON.stringify({ type: 'unsubscribed', channel: payload.channel }));
        }
        break;

      case 'query':
        if (payload.text) {
          // Stream token start event
          client.send(JSON.stringify({ type: 'token_stream_start', sessionId: payload.sessionId }));

          const response = await agentOrchestrator.handleUserMessage({
            sessionId: payload.sessionId || `ws_sesh_${connectionId}`,
            studentId: client.userId,
            prompt: payload.text,
            institutionId: client.institutionId,
          });

          // Simulate low-latency chunked token streaming
          const words = response.answerText.split(' ');
          for (let i = 0; i < words.length; i += 3) {
            const chunk = words.slice(i, i + 3).join(' ') + ' ';
            client.send(
              JSON.stringify({
                type: 'token_chunk',
                token: chunk,
                sessionId: payload.sessionId,
              })
            );
          }

          // Stream completed response with citations and tools
          client.send(
            JSON.stringify({
              type: 'response_complete',
              sessionId: payload.sessionId,
              payload: response,
            })
          );
        }
        break;

      case 'counselor_message':
        if (payload.data?.recipientId) {
          wsClientManager.sendToUser(payload.data.recipientId, {
            type: 'counselor_chat',
            from: client.userId,
            text: payload.text,
            timestamp: new Date().toISOString(),
          });
        }
        break;

      default:
        client.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${payload.type}` }));
    }
  }
}

export const edgeWebSocketServer = EdgeWebSocketServer.getInstance();
