export interface WebSocketClientSession {
  connectionId: string;
  userId: string;
  role: string;
  institutionId: string;
  connectedAt: number;
  lastPingAt: number;
  channels: Set<string>;
  send: (message: string) => void;
}

export class WebSocketClientManager {
  private static instance: WebSocketClientManager;
  private clients: Map<string, WebSocketClientSession> = new Map();
  private userToConnections: Map<string, Set<string>> = new Map();

  public static getInstance(): WebSocketClientManager {
    if (!WebSocketClientManager.instance) {
      WebSocketClientManager.instance = new WebSocketClientManager();
    }
    return WebSocketClientManager.instance;
  }

  public registerClient(session: WebSocketClientSession): void {
    this.clients.set(session.connectionId, session);

    if (!this.userToConnections.has(session.userId)) {
      this.userToConnections.set(session.userId, new Set());
    }
    this.userToConnections.get(session.userId)!.add(session.connectionId);
  }

  public removeClient(connectionId: string): void {
    const session = this.clients.get(connectionId);
    if (session) {
      const userConns = this.userToConnections.get(session.userId);
      if (userConns) {
        userConns.delete(connectionId);
        if (userConns.size === 0) {
          this.userToConnections.delete(session.userId);
        }
      }
      this.clients.delete(connectionId);
    }
  }

  public getClient(connectionId: string): WebSocketClientSession | undefined {
    return this.clients.get(connectionId);
  }

  public getActiveConnectionsCount(): number {
    return this.clients.size;
  }

  public broadcastToChannel(channel: string, message: any): number {
    let sentCount = 0;
    const payload = typeof message === 'string' ? message : JSON.stringify(message);

    for (const client of this.clients.values()) {
      if (client.channels.has(channel)) {
        try {
          client.send(payload);
          sentCount++;
        } catch {
          // Socket write error handled gracefully
        }
      }
    }

    return sentCount;
  }

  public sendToUser(userId: string, message: any): number {
    let sentCount = 0;
    const conns = this.userToConnections.get(userId);
    if (!conns) return 0;

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    for (const connId of conns) {
      const client = this.clients.get(connId);
      if (client) {
        try {
          client.send(payload);
          sentCount++;
        } catch {}
      }
    }

    return sentCount;
  }

  public clear(): void {
    this.clients.clear();
    this.userToConnections.clear();
  }
}

export const wsClientManager = WebSocketClientManager.getInstance();
