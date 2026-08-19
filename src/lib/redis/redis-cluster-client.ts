import { InMemoryStateAdapter, IDistributedStateStore } from "../services/redis-client";

export class RedisClusterClient implements IDistributedStateStore {
  private stateStore: IDistributedStateStore;
  private isCluster: boolean;

  constructor(customStore?: IDistributedStateStore) {
    this.stateStore = customStore || new InMemoryStateAdapter();
    this.isCluster = process.env.REDIS_CLUSTER_NODES !== undefined;
  }

  /**
   * Formats key using Redis hashtag syntax to force cluster slot alignment by tenantId
   * Format: thaiba:{tenant_id}:domain:key
   */
  formatTenantKey(tenantId: string, domain: string, key: string): string {
    const sanitizedTenant = tenantId.replace(/[{}]/g, "");
    return `thaiba:{${sanitizedTenant}}:${domain}:${key}`;
  }

  isRedisConnected(): boolean {
    return this.stateStore.isRedisConnected();
  }

  isClusterMode(): boolean {
    return this.isCluster;
  }

  async get(key: string): Promise<string | null> {
    return this.stateStore.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    return this.stateStore.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<boolean> {
    return this.stateStore.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.stateStore.incr(key);
  }

  async hexists(hashKey: string, field: string): Promise<boolean> {
    return this.stateStore.hexists(hashKey, field);
  }

  async hget(hashKey: string, field: string): Promise<string | null> {
    return this.stateStore.hget(hashKey, field);
  }

  async hset(hashKey: string, field: string, value: string): Promise<boolean> {
    return this.stateStore.hset(hashKey, field, value);
  }

  async hdel(hashKey: string, field: string): Promise<boolean> {
    return this.stateStore.hdel(hashKey, field);
  }
}

export const defaultClusterClient = new RedisClusterClient();
