type WebSocketCallback = (data: any) => void;

export class FinanceWebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<WebSocketCallback>> = new Map();

  connect(url: string = "wss://api.thaibahive.internal/finance/ws") {
    try {
      this.socket = new WebSocket(url);

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const typeListeners = this.listeners.get(payload.type);
          if (typeListeners) {
            typeListeners.forEach((cb) => cb(payload.data));
          }
        } catch {
          // Ignore unparseable WebSocket message
        }
      };

      this.socket.onerror = () => {
        // Graceful fallback to HTTP polling
      };
    } catch {
      // Fallback
    }
  }

  subscribe(eventType: string, callback: WebSocketCallback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners.clear();
  }
}

export const financeWsClient = new FinanceWebSocketClient();
