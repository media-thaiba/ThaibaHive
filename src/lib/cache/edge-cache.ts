import { defaultClusterClient } from "../redis/redis-cluster-client";

// Local cache map for in-memory fast retrieves (Edge KV/Memory Tier)
const memoryCache = new Map<string, { value: string; expiry: number }>();

/**
 * Retrieves a cached HTTP response or data query.
 * First checks local Edge Memory Cache, then falls back to distributed Redis Cluster.
 */
export async function getCachedResponse(key: string): Promise<string | null> {
  const now = Date.now();
  const local = memoryCache.get(key);

  if (local && local.expiry > now) {
    return local.value;
  } else if (local) {
    memoryCache.delete(key);
  }

  // Fallback to Redis Cluster (Regional Caching Tier)
  try {
    const value = await defaultClusterClient.get(key);
    if (value) {
      // Warm up local cache
      memoryCache.set(key, { value, expiry: now + 5000 }); // local TTL: 5s
      return value;
    }
  } catch {
    // Fail-silent: cache errors should never crash requests
  }

  return null;
}

/**
 * Stores a value in both local Edge Memory and Regional Redis caches.
 */
export async function setCachedResponse(
  key: string,
  value: string,
  ttlSeconds = 60
): Promise<void> {
  const now = Date.now();
  memoryCache.set(key, { value, expiry: now + ttlSeconds * 1000 });

  try {
    await defaultClusterClient.set(key, value, ttlSeconds);
  } catch {
    // Fail-silent
  }
}

/**
 * Evicts a key from all caching tiers.
 */
export async function evictCacheKey(key: string): Promise<void> {
  memoryCache.delete(key);
  try {
    await defaultClusterClient.del(key);
  } catch {
    // Fail-silent
  }
}

/**
 * Clears the local memory cache (primarily for tests).
 */
export function clearLocalMemoryCache() {
  memoryCache.clear();
}
