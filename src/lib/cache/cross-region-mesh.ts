/**
 * Cross-Region Redis Invalidation Mesh & Event Broadcaster
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { TenantRegion } from "@/db";
import { RedisClusterClient } from "./redis-cluster";
import {
  CacheInvalidationMessage,
  CacheMeshHealthReport,
  RegionalCacheNode,
  VectorClockState,
} from "./types";

export class CrossRegionCacheMesh {
  private static instance: CrossRegionCacheMesh;
  private nodes: Map<TenantRegion, RedisClusterClient> = new Map();
  private localRegion: TenantRegion = "default";
  private enabled: boolean;
  private totalBroadcasts = 0;
  private sequenceCounters = new Map<TenantRegion, number>();

  private constructor() {
    this.enabled = process.env.CACHE_CROSS_REGION_SYNC_ENABLED !== "false";
    this.initializeDefaultNodes();
  }

  public static getInstance(): CrossRegionCacheMesh {
    if (!CrossRegionCacheMesh.instance) {
      CrossRegionCacheMesh.instance = new CrossRegionCacheMesh();
    }
    return CrossRegionCacheMesh.instance;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public setLocalRegion(region: TenantRegion): void {
    this.localRegion = region;
  }

  public getLocalRegion(): TenantRegion {
    return this.localRegion;
  }

  public registerNode(region: TenantRegion, client: RedisClusterClient): void {
    this.nodes.set(region, client);
  }

  public getNode(region: TenantRegion): RedisClusterClient | undefined {
    return this.nodes.get(region);
  }

  private initializeDefaultNodes() {
    const regions: TenantRegion[] = ["default", "us-east", "eu-central", "ap-south"];
    for (const region of regions) {
      this.nodes.set(region, new RedisClusterClient(region, `redis://${region}.cache.local:6379`));
      this.sequenceCounters.set(region, 0);
    }
  }

  public async broadcastInvalidation(
    keys: string[] = [],
    tags: string[] = [],
    sourceRegion: TenantRegion = this.localRegion
  ): Promise<CacheInvalidationMessage> {
    const currentSeq = (this.sequenceCounters.get(sourceRegion) || 0) + 1;
    this.sequenceCounters.set(sourceRegion, currentSeq);

    const vectorClock: VectorClockState = {
      region: sourceRegion,
      counter: currentSeq,
      logicalTimestamp: Date.now(),
    };

    const message: CacheInvalidationMessage = {
      id: `inval_${sourceRegion}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceRegion,
      keys,
      tags,
      vectorClock,
      timestamp: new Date().toISOString(),
    };

    this.totalBroadcasts++;

    if (!this.enabled) {
      return message;
    }

    const payload = JSON.stringify(message);

    // Broadcast across peer regional clusters
    for (const [region, node] of this.nodes.entries()) {
      if (region === sourceRegion) continue;
      try {
        await node.publish("thaibahive:cache:mesh:invalidation", payload);
        node.simulateIncomingMessage("thaibahive:cache:mesh:invalidation", payload);
      } catch (err) {
        // Non-blocking graceful degradation when a peer region is partitioned
        console.warn(`[CrossRegionCacheMesh] Peer node ${region} unreachable during broadcast:`, err);
      }
    }

    return message;
  }

  private debounceQueue: Map<string, { keys: Set<string>; tags: Set<string>; timer: NodeJS.Timeout }> = new Map();

  public async queueDebouncedInvalidation(
    keys: string[] = [],
    tags: string[] = [],
    sourceRegion: TenantRegion = this.localRegion,
    debounceMs: number = 50
  ): Promise<void> {
    const existing = this.debounceQueue.get(sourceRegion);
    if (existing) {
      keys.forEach((k) => existing.keys.add(k));
      tags.forEach((t) => existing.tags.add(t));
      clearTimeout(existing.timer);
      existing.timer = setTimeout(async () => {
        const batchKeys = Array.from(existing.keys);
        const batchTags = Array.from(existing.tags);
        this.debounceQueue.delete(sourceRegion);
        await this.broadcastInvalidation(batchKeys, batchTags, sourceRegion);
      }, debounceMs);
      if (typeof existing.timer.unref === "function") existing.timer.unref();
    } else {
      const keySet = new Set(keys);
      const tagSet = new Set(tags);
      const timer = setTimeout(async () => {
        const batchKeys = Array.from(keySet);
        const batchTags = Array.from(tagSet);
        this.debounceQueue.delete(sourceRegion);
        await this.broadcastInvalidation(batchKeys, batchTags, sourceRegion);
      }, debounceMs);
      if (typeof timer.unref === "function") timer.unref();
      this.debounceQueue.set(sourceRegion, { keys: keySet, tags: tagSet, timer });
    }
  }

  public getHealthReport(): CacheMeshHealthReport {
    const nodeList: RegionalCacheNode[] = [];
    let healthyCount = 0;
    let totalLatency = 0;
    let totalConflicts = 0;

    for (const node of this.nodes.values()) {
      const status = node.getNodeStatus();
      nodeList.push(status);
      if (status.isHealthy) healthyCount++;
      totalLatency += status.latencyMs;
      totalConflicts += status.conflictsResolved;
    }

    const totalRegions = this.nodes.size;
    const avgLatency = totalRegions > 0 ? Number((totalLatency / totalRegions).toFixed(1)) : 0;

    let meshStatus: CacheMeshHealthReport["meshStatus"] = "healthy";
    if (healthyCount === 0) {
      meshStatus = "partitioned";
    } else if (healthyCount < totalRegions) {
      meshStatus = "degraded";
    }

    return {
      timestamp: new Date().toISOString(),
      meshStatus,
      totalRegions,
      healthyRegions: healthyCount,
      averageLatencyMs: avgLatency,
      totalEventsBroadcast: this.totalBroadcasts,
      totalConflictsResolved: totalConflicts,
      nodes: nodeList,
    };
  }
}

export const crossRegionCacheMesh = CrossRegionCacheMesh.getInstance();
