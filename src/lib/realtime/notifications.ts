type NotificationEvent = {
  type: "new" | "refresh";
  notification?: {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    referenceType?: string | null;
    referenceId?: string | null;
    createdAt: string;
  };
};

type Listener = (event: NotificationEvent) => void;

let eventSource: EventSource | null = null;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 2000;
const MAX_RETRY_DELAY = 30_000;
const listeners = new Set<Listener>();

function connect() {
  if (eventSource) return;

  eventSource = new EventSource("/api/notifications/subscribe");

  eventSource.addEventListener("connected", () => {
    retryDelay = 2000;
    // Trigger initial fetch to sync any missed notifications
    for (const listener of listeners) {
      listener({ type: "refresh" });
    }
  });

  eventSource.addEventListener("notification", (event) => {
    try {
      const data = JSON.parse(event.data) as NotificationEvent;
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

export function subscribeNotifications(listener: Listener): () => void {
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
