export type PresenceEvent = {
  type: "change";
  staffId: string;
  online: boolean;
  lastSeenAt: string;
  status?: string;
  statusText?: string | null;
};

type Listener = (event: PresenceEvent) => void;

let eventSource: EventSource | null = null;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 2000;
const MAX_RETRY_DELAY = 30_000;
const listeners = new Set<Listener>();

function connect() {
  if (eventSource) return;

  eventSource = new EventSource("/api/presence/subscribe");

  eventSource.addEventListener("connected", () => {
    retryDelay = 2000;
  });

  eventSource.addEventListener("presence", (event) => {
    try {
      const data = JSON.parse(event.data) as PresenceEvent;
      for (const listener of listeners) {
        listener(data);
      }
    } catch {
      // Ignore malformed events
    }
  });

  eventSource.onerror = () => {
    eventSource?.close();
    eventSource = null;
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  if (retryTimeout) return;
  retryTimeout = setTimeout(() => {
    retryTimeout = null;
    if (listeners.size > 0) {
      connect();
    }
  }, retryDelay);
  retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
}

export function subscribePresence(listener: Listener): () => void {
  listeners.add(listener);

  if (!eventSource && listeners.size === 1) {
    connect();
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && eventSource) {
      eventSource.close();
      eventSource = null;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
    }
  };
}
