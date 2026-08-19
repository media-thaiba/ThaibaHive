/**
 * SOAR Trigger Deduplication Engine
 * Sprint-040 — Storm & Flapping Prevention Filter
 */

export interface DeduplicationOptions {
  cooldownMs?: number;
}

export class TriggerDeduplicator {
  private static instance: TriggerDeduplicator;
  private cooldownMap: Map<string, number> = new Map();
  private defaultCooldownMs = 300000; // 5 minutes

  private constructor() {}

  public static getInstance(): TriggerDeduplicator {
    if (!TriggerDeduplicator.instance) {
      TriggerDeduplicator.instance = new TriggerDeduplicator();
    }
    return TriggerDeduplicator.instance;
  }

  /**
   * Check if a trigger for a specific entity key is duplicate/flapping
   * Returns true if duplicate (should be dropped), false if new (allowed)
   */
  public isDuplicate(key: string, options?: DeduplicationOptions): boolean {
    if (!key) return false;
    const now = Date.now();
    const cooldown = options?.cooldownMs || this.defaultCooldownMs;

    const lastTrigger = this.cooldownMap.get(key);
    if (lastTrigger && now - lastTrigger < cooldown) {
      return true; // Duplicate / in cooldown
    }

    // Record new trigger timestamp
    this.cooldownMap.set(key, now);
    this.pruneExpired(cooldown);
    return false;
  }

  /**
   * Clear cooldown for a specific key or all keys
   */
  public reset(key?: string): void {
    if (key) {
      this.cooldownMap.delete(key);
    } else {
      this.cooldownMap.clear();
    }
  }

  private pruneExpired(cooldown: number): void {
    if (this.cooldownMap.size < 1000) return;
    const now = Date.now();
    for (const [key, timestamp] of this.cooldownMap.entries()) {
      if (now - timestamp >= cooldown) {
        this.cooldownMap.delete(key);
      }
    }
  }
}

export const triggerDeduplicator = TriggerDeduplicator.getInstance();
