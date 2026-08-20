import { SpatialTelemetryFrame, Point3D, GeofenceEvent } from '../twin-types';

export type SpatialEventType =
  | 'telemetry_update'
  | 'comfort_update'
  | 'asset_location_update'
  | 'geofence_alarm'
  | 'emergency_hazard_declared'
  | 'emergency_route_updated';

export interface SpatialStreamMessage {
  type: SpatialEventType;
  topic: string; // e.g. "facility:FAC-01" or "asset:AST-01" or "emergency"
  data: any;
  timestamp: string;
}

export interface StreamSubscriber {
  id: string;
  tenantId: string;
  topics: Set<string>;
  send: (msg: SpatialStreamMessage) => void;
  lastHeartbeat: number;
}

export class SpatialStreamManager {
  private static instance: SpatialStreamManager;
  private subscribers: Map<string, StreamSubscriber> = new Map();

  public static getInstance(): SpatialStreamManager {
    if (!SpatialStreamManager.instance) {
      SpatialStreamManager.instance = new SpatialStreamManager();
    }
    return SpatialStreamManager.instance;
  }

  public registerSubscriber(
    id: string,
    tenantId: string,
    topics: string[],
    sendCallback: (msg: SpatialStreamMessage) => void
  ): StreamSubscriber {
    const sub: StreamSubscriber = {
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

  public broadcast(message: SpatialStreamMessage, tenantId: string = 'global'): number {
    let deliveredCount = 0;
    for (const [_, sub] of this.subscribers.entries()) {
      if (sub.tenantId === tenantId || tenantId === 'global') {
        if (sub.topics.has(message.topic) || sub.topics.has('*') || sub.topics.has('all')) {
          try {
            sub.send(message);
            deliveredCount++;
          } catch {
            // Broken connection
          }
        }
      }
    }
    return deliveredCount;
  }

  public broadcastTelemetry(frame: SpatialTelemetryFrame, tenantId: string = 'global'): number {
    const topic = `facility:${frame.facilityId}`;
    return this.broadcast(
      {
        type: 'telemetry_update',
        topic,
        data: frame,
        timestamp: new Date().toISOString(),
      },
      tenantId
    );
  }

  public broadcastAssetLocation(
    assetId: string,
    facilityId: string,
    position: Point3D,
    tenantId: string = 'global'
  ): number {
    const topic = `facility:${facilityId}`;
    return this.broadcast(
      {
        type: 'asset_location_update',
        topic,
        data: { assetId, position, facilityId },
        timestamp: new Date().toISOString(),
      },
      tenantId
    );
  }

  public broadcastGeofenceAlarm(event: GeofenceEvent, tenantId: string = 'global'): number {
    return this.broadcast(
      {
        type: 'geofence_alarm',
        topic: 'emergency',
        data: event,
        timestamp: new Date().toISOString(),
      },
      tenantId
    );
  }

  public getActiveSubscribersCount(tenantId?: string): number {
    if (!tenantId || tenantId === 'global') return this.subscribers.size;
    return Array.from(this.subscribers.values()).filter((s) => s.tenantId === tenantId).length;
  }

  public clear(): void {
    this.subscribers.clear();
  }
}
