import { IDistributedStateStore, defaultStateStore } from "./redis-client";

export interface CircuitBreakerStatus {
  circuitKey: string;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failureCount: number;
  lastTrippedAt: string | null;
}

export class RedisStateManager {
  constructor(private store: IDistributedStateStore = defaultStateStore) {}

  private getTenantKey(tenantId: string, category: string, key: string): string {
    return `thaiba:tenant:${tenantId}:${category}:${key}`;
  }

  // ─── Distributed Circuit Breaker ───

  async getCircuitState(tenantId: string, feature: string): Promise<CircuitBreakerStatus> {
    const key = this.getTenantKey(tenantId, "circuit_breaker", feature);
    const stateStr = await this.store.get(`${key}:state`);
    const countStr = await this.store.get(`${key}:failures`);
    const trippedAt = await this.store.get(`${key}:tripped_at`);

    return {
      circuitKey: key,
      state: (stateStr as "CLOSED" | "OPEN" | "HALF_OPEN") || "CLOSED",
      failureCount: countStr ? parseInt(countStr, 10) : 0,
      lastTrippedAt: trippedAt || null,
    };
  }

  async recordFailure(tenantId: string, feature: string, threshold = 5, cooldownSeconds = 300): Promise<CircuitBreakerStatus> {
    const key = this.getTenantKey(tenantId, "circuit_breaker", feature);
    const failures = await this.store.incr(`${key}:failures`);
    let state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
    let trippedAt: string | null = null;

    if (failures >= threshold) {
      state = "OPEN";
      trippedAt = new Date().toISOString();
      await this.store.set(`${key}:state`, "OPEN", cooldownSeconds);
      await this.store.set(`${key}:tripped_at`, trippedAt, cooldownSeconds);
    }

    return {
      circuitKey: key,
      state,
      failureCount: failures,
      lastTrippedAt: trippedAt,
    };
  }

  async resetCircuit(tenantId: string, feature: string): Promise<boolean> {
    const key = this.getTenantKey(tenantId, "circuit_breaker", feature);
    await this.store.del(`${key}:state`);
    await this.store.del(`${key}:failures`);
    await this.store.del(`${key}:tripped_at`);
    return true;
  }

  // ─── Request Deduplication ───

  async isDuplicateRequest(tenantId: string, dedupKey: string, ttlSeconds = 60): Promise<boolean> {
    const key = this.getTenantKey(tenantId, "dedup", dedupKey);
    const existing = await this.store.get(key);
    if (existing) return true;

    await this.store.set(key, "1", ttlSeconds);
    return false;
  }

  // ─── Session / Key-Value Caching ───

  async setCache(tenantId: string, cacheKey: string, payload: unknown, ttlSeconds = 3600): Promise<boolean> {
    const key = this.getTenantKey(tenantId, "cache", cacheKey);
    return this.store.set(key, JSON.stringify(payload), ttlSeconds);
  }

  async getCache<T>(tenantId: string, cacheKey: string): Promise<T | null> {
    const key = this.getTenantKey(tenantId, "cache", cacheKey);
    const raw = await this.store.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  isRedisConnected(): boolean {
    return this.store.isRedisConnected();
  }
}

export const redisStateManager = new RedisStateManager();
