export interface StreamSubscription {
  clientId: string;
  tenantId: string;
  topics: Set<string>; // 'security:alerts' | 'vision:threats' | 'guard:patrols' | 'camera:health' | 'lockdown:status' | 'alpr:live'
  callback: (topic: string, data: any) => void;
}

export class VisionStreamManager {
  private static instance: VisionStreamManager;
  private subscriptions: Map<string, StreamSubscription> = new Map();

  public static getInstance(): VisionStreamManager {
    if (!VisionStreamManager.instance) {
      VisionStreamManager.instance = new VisionStreamManager();
    }
    return VisionStreamManager.instance;
  }

  public subscribe(
    clientId: string,
    tenantId: string,
    topics: string[],
    callback: (topic: string, data: any) => void
  ): void {
    this.subscriptions.set(clientId, {
      clientId,
      tenantId,
      topics: new Set(topics),
      callback,
    });
  }

  public unsubscribe(clientId: string): void {
    this.subscriptions.delete(clientId);
  }

  public broadcast(topic: string, data: any, tenantId: string = 'global'): number {
    let deliveredCount = 0;

    for (const sub of this.subscriptions.values()) {
      if (sub.tenantId === 'global' || sub.tenantId === tenantId) {
        if (sub.topics.has(topic) || sub.topics.has('*')) {
          try {
            sub.callback(topic, data);
            deliveredCount++;
          } catch {}
        }
      }
    }

    return deliveredCount;
  }

  public getActiveClientCount(): number {
    return this.subscriptions.size;
  }

  public clear(): void {
    this.subscriptions.clear();
  }
}
