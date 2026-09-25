/**
 * Energy Stream Manager
 * Edge WebSocket & SSE real-time microgrid telemetry stream manager
 */

export type EnergyEventType =
  | 'power_flow_update'
  | 'solar_generation_update'
  | 'bess_dispatch_update'
  | 'ev_charging_update'
  | 'power_quality_alert'
  | 'carbon_rate_update';

export interface EnergyStreamMessage {
  type: EnergyEventType;
  topic: string; // e.g. "grid:live" | "solar:generation" | "bess:soc" | "ev:charging"
  data: any;
  timestamp: string;
}

export interface EnergySubscriber {
  id: string;
  tenantId: string;
  topics: Set<string>;
  send: (msg: EnergyStreamMessage) => void;
  lastHeartbeat: number;
}

export class EnergyStreamManager {
  private static instance: EnergyStreamManager;
  private subscribers: Map<string, EnergySubscriber> = new Map();

  public static getInstance(): EnergyStreamManager {
    if (!EnergyStreamManager.instance) {
      EnergyStreamManager.instance = new EnergyStreamManager();
    }
    return EnergyStreamManager.instance;
  }

  public registerSubscriber(
    id: string,
    tenantId: string,
    topics: string[],
    sendCallback: (msg: EnergyStreamMessage) => void
  ): EnergySubscriber {
    const sub: EnergySubscriber = {
      id,
      tenantId,
      topics: new Set(topics),
      send: sendCallback,
      lastHeartbeat: Date.now(),
    };
    this.subscribers.set(id, sub);
    return sub;
  }

  public unregisterSubscriber(id: string): void {
    this.subscribers.delete(id);
  }

  public subscribeTopic(id: string, topic: string): void {
    const sub = this.subscribers.get(id);
    if (sub) sub.topics.add(topic);
  }

  public unsubscribeTopic(id: string, topic: string): void {
    const sub = this.subscribers.get(id);
    if (sub) sub.topics.delete(topic);
  }

  public broadcast(msg: EnergyStreamMessage, tenantId: string = 'global'): number {
    let sentCount = 0;
    for (const sub of this.subscribers.values()) {
      if (tenantId !== 'global' && sub.tenantId !== 'global' && sub.tenantId !== tenantId) {
        continue;
      }
      if (sub.topics.has('*') || sub.topics.has(msg.topic)) {
        try {
          sub.send(msg);
          sentCount++;
        } catch {
          // Client disconnected
        }
      }
    }
    return sentCount;
  }

  public getActiveConnectionCount(tenantId?: string): number {
    if (!tenantId || tenantId === 'global') return this.subscribers.size;
    let count = 0;
    for (const sub of this.subscribers.values()) {
      if (sub.tenantId === tenantId) count++;
    }
    return count;
  }

  public heartbeat(id: string): void {
    const sub = this.subscribers.get(id);
    if (sub) sub.lastHeartbeat = Date.now();
  }
}
