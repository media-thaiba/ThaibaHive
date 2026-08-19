/**
 * Distributed Quarantine Sync Mesh via Redis PubSub & In-Memory Bloom Filter
 * Sprint-038 / AGS-007 & Sprint-039 / TIF-001, TIF-014 (TD-014, TD-017)
 */

import { QuarantineBloomFilter } from "./quarantine-bloom";
import { QuarantineRecord } from "./quarantine-store";
import { QuarantineManager } from "./quarantine-manager";
import { EventBus, ObservabilityEvent } from "../observability/event-bus";
import { QuarantinePubSubAdapter, QuarantinePubSubMessage } from "./quarantine-pubsub";

export interface QuarantineMeshEvent {
  action: "QUARANTINE_ADDED" | "QUARANTINE_REMOVED" | "QUARANTINE_SYNC_ALL" | "QUARANTINE_SUBNET_CONTAINED";
  record?: QuarantineRecord;
  records?: QuarantineRecord[];
  ipOrId?: string;
  subnetCidr?: string;
  timestamp: number;
  originNodeId: string;
}

export class QuarantineMesh {
  private static instance: QuarantineMesh | null = null;
  private bloom: QuarantineBloomFilter;
  private nodeId: string;
  private isSubscribed: boolean = false;
  private pubsub: QuarantinePubSubAdapter;

  constructor(nodeId?: string, pubsub?: QuarantinePubSubAdapter) {
    this.bloom = new QuarantineBloomFilter();
    this.nodeId = nodeId || `node_${Math.random().toString(36).substring(2, 9)}`;
    this.pubsub = pubsub || QuarantinePubSubAdapter.getInstance(this.nodeId);
    this.setupSubscriptions();
  }

  public static getInstance(nodeId?: string, pubsub?: QuarantinePubSubAdapter): QuarantineMesh {
    if (!QuarantineMesh.instance) {
      QuarantineMesh.instance = new QuarantineMesh(nodeId, pubsub);
    }
    return QuarantineMesh.instance;
  }

  public getPubSubAdapter(): QuarantinePubSubAdapter {
    return this.pubsub;
  }

  private setupSubscriptions(): void {
    if (this.isSubscribed) return;

    // 1. Subscribe to Redis PubSub adapter
    this.pubsub.subscribe((msg: QuarantinePubSubMessage) => {
      this.handlePubSubMessage(msg);
    });

    // 2. Fallback / Observability EventBus subscription
    try {
      EventBus.getInstance().subscribe((obsEvent: ObservabilityEvent) => {
        if (!obsEvent || obsEvent.type !== "event" || !obsEvent.data) return;
        if (obsEvent.data.eventSource !== "security_quarantine_mesh") return;
        this.handleMeshEvent((obsEvent.data as unknown) as QuarantineMeshEvent);
      });
    } catch {
      // Ignore during test if EventBus mocked
    }

    this.isSubscribed = true;
  }

  public handlePubSubMessage(msg: QuarantinePubSubMessage): void {
    if (msg.originNodeId === this.nodeId) {
      return;
    }

    if (msg.action === "ADD" && msg.record) {
      this.bloom.add(msg.record.ipAddress);
      QuarantineManager.getInstance().getStore().addQuarantine(msg.record, false);
    } else if (msg.action === "REMOVE" && msg.ipOrId) {
      QuarantineManager.getInstance().getStore().removeQuarantine(msg.ipOrId, false);
      this.rebuildBloom();
    } else if (msg.action === "CONTAIN_SUBNET" && msg.record) {
      this.bloom.add(msg.record.ipAddress);
      QuarantineManager.getInstance().getStore().addQuarantine(msg.record, false);
    } else if (msg.action === "CIRCUIT_BREAKER_STATE" as any || (msg as any).circuitState) {
      // Sync circuit breaker state from peer node (TIF-014)
      const circuitState = (msg as any).circuitState || (msg as any).payload?.circuitState;
      if (circuitState) {
        try {
          const { GatewayCircuitBreaker } = require("./circuit-breaker");
          const breaker = GatewayCircuitBreaker.getInstance();
          if (breaker.getState() !== circuitState) {
            breaker.transitionTo(circuitState, `Synchronized from peer mesh node ${msg.originNodeId}`);
          }
        } catch {
          // Non-blocking
        }
      }
    } else if ((msg.action === "SYNC_ALL" as any) || (msg.action === "SYNC_RESPONSE" && msg.records)) {
      if (msg.records) {
        for (const rec of msg.records) {
          QuarantineManager.getInstance().getStore().addQuarantine(rec, false);
        }
        this.rebuildBloom();
      }
    } else if (msg.action === "SYNC_REQUEST") {
      // Respond with active quarantines
      const active = QuarantineManager.getInstance().getStore().getAllActiveQuarantines();
      this.pubsub.publish("SYNC_RESPONSE", { records: active }).catch(() => {});
    }
  }

  public handleMeshEvent(event: QuarantineMeshEvent): void {
    if (event.originNodeId === this.nodeId) {
      return;
    }

    if (event.action === "QUARANTINE_ADDED" && event.record) {
      this.bloom.add(event.record.ipAddress);
      QuarantineManager.getInstance().getStore().addQuarantine(event.record, false);
    } else if (event.action === "QUARANTINE_REMOVED" && event.ipOrId) {
      QuarantineManager.getInstance().getStore().removeQuarantine(event.ipOrId, false);
      this.rebuildBloom();
    } else if (event.action === "QUARANTINE_SYNC_ALL" && event.records) {
      for (const rec of event.records) {
        QuarantineManager.getInstance().getStore().addQuarantine(rec, false);
      }
      this.rebuildBloom();
    }
  }

  public broadcastQuarantine(record: QuarantineRecord): void {
    this.bloom.add(record.ipAddress);
    // Broadcast via Redis PubSub
    this.pubsub.publish("ADD", { record }).catch(() => {});

    // Also notify EventBus for observability
    try {
      EventBus.getInstance().publishEvent({
        eventSource: "security_quarantine_mesh",
        severity: "critical",
        message: `Quarantine added for IP ${record.ipAddress} (${record.cidrMask}): ${record.reason}`,
        action: "QUARANTINE_ADDED",
        record,
        timestamp: new Date().toISOString(),
        originNodeId: this.nodeId,
      } as any);
    } catch {
      // Fallback
    }
  }

  public broadcastSubnetContainment(record: QuarantineRecord, subnetCidr: string): void {
    this.bloom.add(record.ipAddress);
    this.pubsub.publish("CONTAIN_SUBNET", { record, subnetCidr }).catch(() => {});

    try {
      EventBus.getInstance().publishEvent({
        eventSource: "security_quarantine_mesh",
        severity: "critical",
        message: `Subnet auto-contained: ${subnetCidr} (Origin IP: ${record.ipAddress})`,
        action: "QUARANTINE_SUBNET_CONTAINED",
        record,
        subnetCidr,
        timestamp: new Date().toISOString(),
        originNodeId: this.nodeId,
      } as any);
    } catch {
      // Fallback
    }
  }

  public broadcastUnban(ipOrId: string): void {
    this.pubsub.publish("REMOVE", { ipOrId }).catch(() => {});

    try {
      EventBus.getInstance().publishEvent({
        eventSource: "security_quarantine_mesh",
        severity: "info",
        message: `Quarantine removed for IP/ID ${ipOrId}`,
        action: "QUARANTINE_REMOVED",
        ipOrId,
        timestamp: new Date().toISOString(),
        originNodeId: this.nodeId,
      } as any);
    } catch {
      // Fallback
    }
    this.rebuildBloom();
  }

  /**
   * Resyncs in-memory bloom filter and store upon reconnection to central mesh.
   */
  public resyncFromCentralStore(): void {
    const active = QuarantineManager.getInstance().getStore().getAllActiveQuarantines();
    this.rebuildBloom();

    // Broadcast sync request to peer nodes
    this.pubsub.publish("SYNC_REQUEST", {}).catch(() => {});

    try {
      EventBus.getInstance().publishEvent({
        eventSource: "security_quarantine_mesh",
        severity: "info",
        message: `Node ${this.nodeId} triggered full quarantine sync`,
        action: "QUARANTINE_SYNC_ALL",
        records: active,
        timestamp: new Date().toISOString(),
        originNodeId: this.nodeId,
      } as any);
    } catch {
      // Fallback
    }
  }

  /**
   * Fast-path check using in-memory Bloom filter.
   * If Bloom filter returns false, request is guaranteed NOT quarantined (< 0.05ms).
   */
  public fastCheckIsQuarantined(ip: string, tenantId: string = "default"): boolean {
    if (!this.bloom.mightContain(ip)) {
      return false;
    }
    return QuarantineManager.getInstance().isBanned(ip, tenantId);
  }

  public rebuildBloom(): void {
    this.bloom.clear();
    const active = QuarantineManager.getInstance().getStore().getAllActiveQuarantines();
    for (const r of active) {
      this.bloom.add(r.ipAddress);
    }
  }

  public getBloom(): QuarantineBloomFilter {
    return this.bloom;
  }

  public reset(): void {
    this.bloom.clear();
    this.pubsub.reset();
  }
}
