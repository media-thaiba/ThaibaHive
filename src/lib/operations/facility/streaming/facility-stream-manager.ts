export interface FacilityStreamEvent {
  eventType: 'telemetry_reading' | 'anomaly_alert' | 'work_order_update' | 'load_shed_event';
  timestamp: string;
  institutionId: string;
  data: any;
}

export type FacilityStreamSubscriber = (event: FacilityStreamEvent) => void;

export class FacilityStreamManager {
  private static instance: FacilityStreamManager;
  private subscribers: Map<string, Set<FacilityStreamSubscriber>> = new Map();

  public static getInstance(): FacilityStreamManager {
    if (!FacilityStreamManager.instance) {
      FacilityStreamManager.instance = new FacilityStreamManager();
    }
    return FacilityStreamManager.instance;
  }

  public subscribe(institutionId: string, subscriber: FacilityStreamSubscriber): () => void {
    if (!this.subscribers.has(institutionId)) {
      this.subscribers.set(institutionId, new Set());
    }
    this.subscribers.get(institutionId)!.add(subscriber);

    return () => {
      this.subscribers.get(institutionId)?.delete(subscriber);
    };
  }

  public broadcast(event: FacilityStreamEvent): void {
    const subs = this.subscribers.get(event.institutionId);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb(event);
        } catch {}
      });
    }

    // Also broadcast to global if not global
    if (event.institutionId !== 'global') {
      const globalSubs = this.subscribers.get('global');
      if (globalSubs) {
        globalSubs.forEach((cb) => {
          try {
            cb(event);
          } catch {}
        });
      }
    }
  }

  public getSubscriberCount(institutionId: string = 'global'): number {
    return this.subscribers.get(institutionId)?.size || 0;
  }
}

export const facilityStreamManager = FacilityStreamManager.getInstance();
