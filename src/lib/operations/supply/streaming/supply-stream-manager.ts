/**
 * Real-Time Supply Chain Telemetry Stream Manager
 * SUPPLY-HIVE / ProcurementOS (Sprint-054)
 */

export interface SupplyStreamEvent {
  topic: string; // e.g. 'orders:status', 'receiving:dock', 'matching:variance', 'spend:encumbrance'
  event: string;
  data: Record<string, any>;
  timestamp: string;
  institutionId: string;
}

export type SupplyStreamSubscriber = (event: SupplyStreamEvent) => void;

export class SupplyStreamManager {
  private static instance: SupplyStreamManager;
  private subscribers: Map<string, Set<SupplyStreamSubscriber>> = new Map();
  private eventHistory: Map<string, SupplyStreamEvent[]> = new Map();

  public static getInstance(): SupplyStreamManager {
    if (!SupplyStreamManager.instance) {
      SupplyStreamManager.instance = new SupplyStreamManager();
    }
    return SupplyStreamManager.instance;
  }

  public subscribe(topic: string, institutionId: string, callback: SupplyStreamSubscriber): () => void {
    const key = `${institutionId}:${topic}`;
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      const set = this.subscribers.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  public broadcast(event: SupplyStreamEvent): void {
    const key = `${event.institutionId}:${event.topic}`;
    const globalKey = `global:${event.topic}`;

    // Buffer in history (keep last 50 per topic)
    if (!this.eventHistory.has(key)) {
      this.eventHistory.set(key, []);
    }
    const history = this.eventHistory.get(key)!;
    history.unshift(event);
    if (history.length > 50) history.pop();

    const targetedSubscribers = this.subscribers.get(key);
    if (targetedSubscribers) {
      for (const sub of targetedSubscribers) {
        try {
          sub(event);
        } catch {}
      }
    }

    const globalSubscribers = this.subscribers.get(globalKey);
    if (globalSubscribers && event.institutionId !== 'global') {
      for (const sub of globalSubscribers) {
        try {
          sub(event);
        } catch {}
      }
    }
  }

  public getRecentEvents(topic: string, institutionId: string): SupplyStreamEvent[] {
    const key = `${institutionId}:${topic}`;
    return this.eventHistory.get(key) || [];
  }
}
