/**
 * Multi-Region Redis Cluster Client Wrapper
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { TenantRegion } from "@/db";
import { RegionalCacheNode } from "./types";
import { RedisMeshPartitionInjector } from "../dr/failure-injectors";

export class RedisClusterClient {
  private region: TenantRegion;
  private url: string;
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();
  private subscribers: Array<(channel: string, message: string) => void> = [];
  private totalEventsProcessed = 0;
  private conflictsResolved = 0;

  constructor(region: TenantRegion, url: string = "redis://localhost:6379") {
    this.region = region;
    this.url = url;
  }

  public getRegion(): TenantRegion {
    return this.region;
  }

  public getUrl(): string {
    return this.url;
  }

  public isPartitioned(): boolean {
    return RedisMeshPartitionInjector.isMeshPartitioned(this.region);
  }

  public async get(key: string): Promise<string | null> {
    if (this.isPartitioned()) {
      throw new Error(`[RedisCluster] Region '${this.region}' is partitioned from cluster`);
    }
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isPartitioned()) {
      throw new Error(`[RedisCluster] Region '${this.region}' is partitioned from cluster`);
    }
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  public async del(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  public async publish(channel: string, message: string): Promise<number> {
    if (this.isPartitioned()) {
      throw new Error(`[RedisCluster] Cannot publish: Region '${this.region}' is partitioned`);
    }
    this.totalEventsProcessed++;
    return 1;
  }

  public subscribe(handler: (channel: string, message: string) => void): void {
    this.subscribers.push(handler);
  }

  public simulateIncomingMessage(channel: string, message: string): void {
    if (this.isPartitioned()) return;
    this.totalEventsProcessed++;
    for (const sub of this.subscribers) {
      sub(channel, message);
    }
  }

  public recordConflict(): void {
    this.conflictsResolved++;
  }

  public getNodeStatus(): RegionalCacheNode {
    const isHealthy = !this.isPartitioned();
    return {
      region: this.region,
      url: this.url,
      isHealthy,
      latencyMs: isHealthy ? 12 : 999,
      lastSyncAt: new Date().toISOString(),
      queueDepth: 0,
      totalEventsProcessed: this.totalEventsProcessed,
      conflictsResolved: this.conflictsResolved,
    };
  }
}
