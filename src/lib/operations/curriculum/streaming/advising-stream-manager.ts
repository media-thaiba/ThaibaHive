export type AdvisingStreamEventType =
  | 'token_chunk'
  | 'domain_handoff'
  | 'roadmap_updated'
  | 'audit_completed'
  | 'retention_alert_created'
  | 'session_closed';

export interface AdvisingStreamMessage {
  sessionId: string;
  eventType: AdvisingStreamEventType;
  payload: any;
  timestamp: string;
  institutionId: string;
}

export type StreamSubscriber = (message: AdvisingStreamMessage) => void;

export class AdvisingStreamManager {
  private static instance: AdvisingStreamManager;
  private subscribers: Map<string, Set<StreamSubscriber>> = new Map(); // sessionId -> Set of callbacks
  private institutionSubscribers: Map<string, Set<StreamSubscriber>> = new Map(); // institutionId -> Set of callbacks

  public static getInstance(): AdvisingStreamManager {
    if (!AdvisingStreamManager.instance) {
      AdvisingStreamManager.instance = new AdvisingStreamManager();
    }
    return AdvisingStreamManager.instance;
  }

  public subscribeSession(sessionId: string, subscriber: StreamSubscriber): () => void {
    if (!this.subscribers.has(sessionId)) {
      this.subscribers.set(sessionId, new Set());
    }
    this.subscribers.get(sessionId)!.add(subscriber);

    return () => {
      this.subscribers.get(sessionId)?.delete(subscriber);
    };
  }

  public subscribeInstitution(institutionId: string, subscriber: StreamSubscriber): () => void {
    if (!this.institutionSubscribers.has(institutionId)) {
      this.institutionSubscribers.set(institutionId, new Set());
    }
    this.institutionSubscribers.get(institutionId)!.add(subscriber);

    return () => {
      this.institutionSubscribers.get(institutionId)?.delete(subscriber);
    };
  }

  public broadcastToSession(sessionId: string, eventType: AdvisingStreamEventType, payload: any, institutionId: string = 'global'): void {
    const message: AdvisingStreamMessage = {
      sessionId,
      eventType,
      payload,
      timestamp: new Date().toISOString(),
      institutionId,
    };

    // Send to session subscribers
    const sessionSubs = this.subscribers.get(sessionId);
    if (sessionSubs) {
      for (const sub of sessionSubs) {
        try {
          sub(message);
        } catch {}
      }
    }

    // Also send to institution broadcast channel for counselor cockpits
    const instSubs = this.institutionSubscribers.get(institutionId);
    if (instSubs) {
      for (const sub of instSubs) {
        try {
          sub(message);
        } catch {}
      }
    }
  }

  public getActiveSubscribersCount(sessionId: string): number {
    return this.subscribers.get(sessionId)?.size || 0;
  }
}

export const advisingStream = AdvisingStreamManager.getInstance();
