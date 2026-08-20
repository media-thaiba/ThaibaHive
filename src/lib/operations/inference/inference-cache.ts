import { InferenceResult } from './inference-types';
import * as crypto from 'crypto';

/**
 * LRU Edge Prediction Cache with SHA-256 Vector Keys
 */
export class InferenceCache {
  private cache: Map<string, { result: InferenceResult; expiresAt: number }> = new Map();
  private maxEntries: number;
  private defaultTtlMs: number;

  constructor(maxEntries: number = 1000, defaultTtlMs: number = 300000) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
  }

  public static hashInput(modelId: string, inputVector: number[]): string {
    const keyStr = `${modelId}:${inputVector.map((v) => v.toFixed(3)).join(',')}`;
    return crypto.createHash('sha256').update(keyStr).digest('hex').slice(0, 24);
  }

  public get(modelId: string, inputVector: number[]): InferenceResult | undefined {
    const key = InferenceCache.hashInput(modelId, inputVector);
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);

    return {
      ...entry.result,
      servedFromCache: true,
    };
  }

  public set(modelId: string, inputVector: number[], result: InferenceResult, ttlMs?: number): void {
    const key = InferenceCache.hashInput(modelId, inputVector);

    if (this.cache.size >= this.maxEntries) {
      // Evict oldest (first) key
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      result,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}
