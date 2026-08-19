import { logIdentityEvent } from "./identity-audit-events";
import { updateBloomSize } from "./revocation-metrics";

// ─── Bloom Filter Implementation ─────────────────────────────────────────────

export class BloomFilter {
  private size: number;
  private bits: Uint8Array;

  constructor(size = 10000) {
    this.size = size;
    this.bits = new Uint8Array(Math.ceil(size / 8));
  }

  private getHashes(key: string): [number, number, number] {
    let h1 = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
      h1 ^= key.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193);
    }
    const h2 = (h1 ^ (h1 >>> 16)) >>> 0;
    const h3 = (h1 + (h2 << 5)) >>> 0;
    return [Math.abs(h1) % this.size, Math.abs(h2) % this.size, Math.abs(h3) % this.size];
  }

  add(key: string): void {
    const hashes = this.getHashes(key);
    for (const h of hashes) {
      const byteIndex = Math.floor(h / 8);
      const bitIndex = h % 8;
      this.bits[byteIndex] |= (1 << bitIndex);
    }
  }

  mightContain(key: string): boolean {
    const hashes = this.getHashes(key);
    for (const h of hashes) {
      const byteIndex = Math.floor(h / 8);
      const bitIndex = h % 8;
      if ((this.bits[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true;
  }

  getSizeBytes(): number {
    return this.bits.byteLength;
  }

  clear(): void {
    this.bits.fill(0);
  }
}

// ─── Revocation Store ─────────────────────────────────────────────────────────

export interface RevocationRecord {
  sessionId: string;
  userId: string;
  reason: string;
  revokedAt: string;
}

export class RevocationStore {
  private static _instance: RevocationStore;
  private readonly bloomFilter = new BloomFilter(10000);
  private readonly revokedSet = new Set<string>();
  private readonly records: RevocationRecord[] = [];

  private constructor() {}

  static getInstance(): RevocationStore {
    if (!RevocationStore._instance) {
      RevocationStore._instance = new RevocationStore();
    }
    return RevocationStore._instance;
  }

  /** Marks a session as revoked in the bloom filter, in-memory set, and appends a record. */
  revoke(sessionId: string, userId: string, reason: string): void {
    this.bloomFilter.add(sessionId);
    this.revokedSet.add(sessionId);
    this.records.push({ sessionId, userId, reason, revokedAt: new Date().toISOString() });
    updateBloomSize(this.bloomFilter.getSizeBytes());
  }

  /**
   * Fast O(1) bloom-filter check followed by exact hash-set verification.
   */
  isRevoked(sessionId: string): boolean {
    if (!this.bloomFilter.mightContain(sessionId)) {
      return false;
    }
    return this.revokedSet.has(sessionId);
  }

  /** Marks a user as completely revoked / on security hold. */
  revokeUser(userId: string, reason: string): void {
    this.bloomFilter.add(`user:${userId}`);
    this.revokedSet.add(`user:${userId}`);
    this.records.push({ sessionId: `user:${userId}`, userId, reason, revokedAt: new Date().toISOString() });
    updateBloomSize(this.bloomFilter.getSizeBytes());
  }

  /** Un-revokes a user (for compensation / unlocking). */
  unrevokeUser(userId: string): void {
    this.revokedSet.delete(`user:${userId}`);
  }

  /** Checks if a user is currently under security hold / revoked. */
  isUserRevoked(userId: string): boolean {
    if (!this.bloomFilter.mightContain(`user:${userId}`)) {
      return false;
    }
    return this.revokedSet.has(`user:${userId}`);
  }

  /** Returns memory stats for observability. */
  getStats(): { revokedCount: number; bloomSizeBytes: number } {
    return {
      revokedCount: this.revokedSet.size,
      bloomSizeBytes: this.bloomFilter.getSizeBytes(),
    };
  }

  /** Returns recent revocation records (last N). */
  getRecentRecords(limit = 50): RevocationRecord[] {
    return this.records.slice(-limit);
  }

  /** Used in tests only — resets the store. */
  _reset(): void {
    this.bloomFilter.clear();
    this.revokedSet.clear();
    this.records.length = 0;
    updateBloomSize(this.bloomFilter.getSizeBytes());
  }
}

export const revocationStore = RevocationStore.getInstance();

/** Convenience function used by route handler. */
export async function revokeSession(
  sessionId: string,
  userId: string,
  reason: string,
  institutionId?: string,
): Promise<void> {
  revocationStore.revoke(sessionId, userId, reason);
  await logIdentityEvent({
    eventType: "session.revoked",
    userId,
    institutionId,
    reason,
  });
}
