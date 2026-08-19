/**
 * Redis PubSub Distributed Quarantine Synchronization Adapter
 * Sprint-039 / TIF-001 & TIF-017 (TD-014)
 */

import { QuarantineRecord } from "./quarantine-store";
import { GatewayMetricsTracker } from "./gateway-metrics";

export type QuarantinePubSubAction =
  | "ADD"
  | "REMOVE"
  | "CONTAIN_SUBNET"
  | "SYNC_REQUEST"
  | "SYNC_RESPONSE"
  | "CIRCUIT_BREAKER_STATE";

export interface QuarantinePubSubMessage {
  messageId: string;
  action: QuarantinePubSubAction;
  record?: QuarantineRecord;
  records?: QuarantineRecord[];
  ipOrId?: string;
  subnetCidr?: string;
  circuitState?: "CLOSED" | "OPEN" | "HALF_OPEN";
  originNodeId: string;
  timestamp: number;
}

export interface IRedisPubSubClient {
  publish(channel: string, message: string): Promise<number | void>;
  subscribe(channel: string, callback: (message: string, channel: string) => void): Promise<void>;
  unsubscribe(channel?: string): Promise<void>;
  ping?(): Promise<string>;
  isOpen?: boolean;
}

export class QuarantinePubSubAdapter {
  private static instance: QuarantinePubSubAdapter | null = null;
  private client: IRedisPubSubClient | null = null;
  private channelName: string;
  private isConnected: boolean = false;
  private isFallback: boolean = true;
  private nodeId: string;
  private subscribers: Set<(msg: QuarantinePubSubMessage) => void> = new Set();
  private processedMessageIds: Set<string> = new Set();
  private recentLatencies: number[] = [];

  constructor(nodeId?: string, client?: IRedisPubSubClient | null, channelName: string = "security:quarantine:events") {
    this.nodeId = nodeId || `node_${Math.random().toString(36).substring(2, 9)}`;
    this.channelName = channelName;
    if (client) {
      this.setClient(client);
    }
  }

  public static getInstance(nodeId?: string): QuarantinePubSubAdapter {
    if (!QuarantinePubSubAdapter.instance) {
      QuarantinePubSubAdapter.instance = new QuarantinePubSubAdapter(nodeId);
    }
    return QuarantinePubSubAdapter.instance;
  }

  public setClient(client: IRedisPubSubClient | null): void {
    this.client = client;
    this.isConnected = client !== null;
    this.isFallback = client === null;

    if (this.client) {
      try {
        this.client.subscribe(this.channelName, (rawMsg: string) => {
          this.handleRawIncomingMessage(rawMsg);
        });
      } catch {
        this.isConnected = false;
        this.isFallback = true;
      }
    }
  }

  public getNodeId(): string {
    return this.nodeId;
  }

  public isUsingFallback(): boolean {
    return this.isFallback;
  }

  public isClientConnected(): boolean {
    return this.isConnected;
  }

  public subscribe(handler: (msg: QuarantinePubSubMessage) => void): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  public async publish(
    action: QuarantinePubSubAction,
    payload: Omit<QuarantinePubSubMessage, "action" | "originNodeId" | "timestamp" | "messageId">
  ): Promise<boolean> {
    const now = Date.now();
    const messageId = `msg_${now}_${Math.random().toString(36).substring(2, 8)}`;
    const fullMessage: QuarantinePubSubMessage = {
      messageId,
      action,
      ...payload,
      originNodeId: this.nodeId,
      timestamp: now,
    };

    // Mark as processed locally so node doesn't re-handle own event if echoed
    this.processedMessageIds.add(messageId);

    // Track OpenMetrics event
    GatewayMetricsTracker.getInstance().recordMeshPubSubEvent();

    if (this.client && this.isConnected) {
      try {
        await this.client.publish(this.channelName, JSON.stringify(fullMessage));
        return true;
      } catch {
        this.isConnected = false;
        this.isFallback = true;
        // Fallback: notify local subscribers directly
        this.notifyLocalSubscribers(fullMessage);
        return false;
      }
    } else {
      // In-process fallback
      this.notifyLocalSubscribers(fullMessage);
      return true;
    }
  }

  private handleRawIncomingMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw) as QuarantinePubSubMessage;
      if (!msg || !msg.messageId || !msg.action) return;

      // Ignore self-published or already processed messages
      if (msg.originNodeId === this.nodeId || this.processedMessageIds.has(msg.messageId)) {
        return;
      }

      this.processedMessageIds.add(msg.messageId);
      // Keep processed list bounded
      if (this.processedMessageIds.size > 2000) {
        const first = this.processedMessageIds.values().next().value;
        if (first) this.processedMessageIds.delete(first);
      }

      // Record latency
      const latencyMs = Math.max(0, Date.now() - msg.timestamp);
      const latencySec = latencyMs / 1000;
      this.recentLatencies.push(latencyMs);
      if (this.recentLatencies.length > 100) {
        this.recentLatencies.shift();
      }

      // Track OpenMetrics latency & event count
      GatewayMetricsTracker.getInstance().recordMeshPubSubEvent(latencySec);

      this.notifyLocalSubscribers(msg);
    } catch {
      // Ignore malformed payloads
    }
  }

  private notifyLocalSubscribers(msg: QuarantinePubSubMessage): void {
    for (const sub of this.subscribers) {
      try {
        sub(msg);
      } catch {
        // Prevent subscriber error from breaking dispatcher loop
      }
    }
  }

  public getAverageSyncLatencyMs(): number {
    if (this.recentLatencies.length === 0) return 0;
    const sum = this.recentLatencies.reduce((a, b) => a + b, 0);
    return sum / this.recentLatencies.length;
  }

  public reset(): void {
    this.subscribers.clear();
    this.processedMessageIds.clear();
    this.recentLatencies = [];
  }
}
