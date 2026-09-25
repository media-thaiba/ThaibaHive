export interface DocGenTelemetryEvent {
  eventType: 'batch_progress' | 'export_completed' | 'push_dispatched' | 'doc_generated';
  timestamp: string;
  institutionId: string;
  data: Record<string, any>;
}

export type TelemetryListener = (event: DocGenTelemetryEvent) => void;

export class DocGenTelemetryManager {
  private static instance: DocGenTelemetryManager;
  private listeners: Set<TelemetryListener> = new Set();

  public static getInstance(): DocGenTelemetryManager {
    if (!DocGenTelemetryManager.instance) {
      DocGenTelemetryManager.instance = new DocGenTelemetryManager();
    }
    return DocGenTelemetryManager.instance;
  }

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public emit(event: Omit<DocGenTelemetryEvent, 'timestamp'>): void {
    const fullEvent: DocGenTelemetryEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    for (const listener of this.listeners) {
      try {
        listener(fullEvent);
      } catch (err) {
        console.error('[DocGenTelemetryManager] Listener error:', err);
      }
    }
  }
}
