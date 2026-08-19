/**
 * Cross-Region Redis Cache Synchronization & Invalidation Types
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { TenantRegion } from "@/db";

export interface VectorClockState {
  region: TenantRegion;
  counter: number;
  logicalTimestamp: number;
}

export interface CacheInvalidationMessage {
  id: string;
  sourceRegion: TenantRegion;
  keys: string[];
  tags: string[];
  vectorClock: VectorClockState;
  timestamp: string;
}

export interface RegionalCacheNode {
  region: TenantRegion;
  url: string;
  isHealthy: boolean;
  latencyMs: number;
  lastSyncAt: string;
  queueDepth: number;
  totalEventsProcessed: number;
  conflictsResolved: number;
}

export interface CacheMeshHealthReport {
  timestamp: string;
  meshStatus: "healthy" | "degraded" | "partitioned";
  totalRegions: number;
  healthyRegions: number;
  averageLatencyMs: number;
  totalEventsBroadcast: number;
  totalConflictsResolved: number;
  nodes: RegionalCacheNode[];
}
