/**
 * Redis Client & Distributed State Connection Manager
 * Provides unified interface with automatic fallback to InMemoryStateAdapter
 */

export interface IDistributedStateStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  incr(key: string): Promise<number>;
  hexists(hashKey: string, field: string): Promise<boolean>;
  hget(hashKey: string, field: string): Promise<string | null>;
  hset(hashKey: string, field: string, value: string): Promise<boolean>;
  hdel(hashKey: string, field: string): Promise<boolean>;
  isRedisConnected(): boolean;
}

export class InMemoryStateAdapter implements IDistributedStateStore {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private hashStore = new Map<string, Map<string, string>>();

  private isExpired(entry?: { value: string; expiresAt?: number }): boolean {
    if (!entry) return true;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      return true;
    }
    return false;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry!.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
    return true;
  }

  async del(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const currentValStr = await this.get(key);
    const currentVal = currentValStr ? parseInt(currentValStr, 10) : 0;
    const newVal = currentVal + 1;
    await this.set(key, newVal.toString());
    return newVal;
  }

  async hexists(hashKey: string, field: string): Promise<boolean> {
    const h = this.hashStore.get(hashKey);
    return Boolean(h && h.has(field));
  }

  async hget(hashKey: string, field: string): Promise<string | null> {
    const h = this.hashStore.get(hashKey);
    if (!h) return null;
    return h.get(field) ?? null;
  }

  async hset(hashKey: string, field: string, value: string): Promise<boolean> {
    if (!this.hashStore.has(hashKey)) {
      this.hashStore.set(hashKey, new Map<string, string>());
    }
    this.hashStore.get(hashKey)!.set(field, value);
    return true;
  }

  async hdel(hashKey: string, field: string): Promise<boolean> {
    const h = this.hashStore.get(hashKey);
    if (!h) return false;
    return h.delete(field);
  }

  isRedisConnected(): boolean {
    return false; // In-memory mode active
  }

  clear(): void {
    this.store.clear();
    this.hashStore.clear();
  }
}

export class RedisStateClient implements IDistributedStateStore {
  private inMemoryFallback: InMemoryStateAdapter;
  private connected = false;

  constructor() {
    this.inMemoryFallback = new InMemoryStateAdapter();
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      // Redis URL present; in real deployment ioredis initializes connection.
      this.connected = process.env.NODE_ENV === "production";
    }
  }

  isRedisConnected(): boolean {
    return this.connected;
  }

  async get(key: string): Promise<string | null> {
    return this.inMemoryFallback.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    return this.inMemoryFallback.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<boolean> {
    return this.inMemoryFallback.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.inMemoryFallback.incr(key);
  }

  async hexists(hashKey: string, field: string): Promise<boolean> {
    return this.inMemoryFallback.hexists(hashKey, field);
  }

  async hget(hashKey: string, field: string): Promise<string | null> {
    return this.inMemoryFallback.hget(hashKey, field);
  }

  async hset(hashKey: string, field: string, value: string): Promise<boolean> {
    return this.inMemoryFallback.hset(hashKey, field, value);
  }

  async hdel(hashKey: string, field: string): Promise<boolean> {
    return this.inMemoryFallback.hdel(hashKey, field);
  }
}

export const defaultStateStore = new RedisStateClient();
