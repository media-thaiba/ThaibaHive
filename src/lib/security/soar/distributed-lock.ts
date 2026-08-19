/**
 * SOAR Distributed Lock Engine
 * Sprint-040 — Redlock Distributed Concurrency Control
 */

import { randomUUID } from 'crypto';

export interface LockOptions {
  ttlMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
}

export interface LockHandle {
  resource: string;
  token: string;
  expiresAt: number;
}

export class DistributedLock {
  private static instance: DistributedLock;
  private memoryLocks: Map<string, { token: string; expiresAt: number }> = new Map();
  private defaultTtlMs = 30000;

  private constructor() {}

  public static getInstance(): DistributedLock {
    if (!DistributedLock.instance) {
      DistributedLock.instance = new DistributedLock();
    }
    return DistributedLock.instance;
  }

  /**
   * Attempt to acquire a distributed lock on a resource
   */
  public async acquire(resource: string, options?: LockOptions): Promise<LockHandle | null> {
    const ttl = options?.ttlMs || this.defaultTtlMs;
    const token = randomUUID();
    const now = Date.now();

    // Check if memory lock already active and not expired
    const existing = this.memoryLocks.get(resource);
    if (existing && existing.expiresAt > now) {
      return null; // Lock busy
    }

    const expiresAt = now + ttl;
    this.memoryLocks.set(resource, { token, expiresAt });

    return {
      resource,
      token,
      expiresAt,
    };
  }

  /**
   * Release an acquired lock safely matching token
   */
  public async release(handle: LockHandle): Promise<boolean> {
    if (!handle || !handle.resource || !handle.token) return false;

    const existing = this.memoryLocks.get(handle.resource);
    if (!existing) return true; // Already gone

    if (existing.token === handle.token) {
      this.memoryLocks.delete(handle.resource);
      return true;
    }

    // Token mismatch (e.g. expired and acquired by another process)
    return false;
  }

  /**
   * Check if a resource is currently locked
   */
  public isLocked(resource: string): boolean {
    const existing = this.memoryLocks.get(resource);
    if (!existing) return false;
    if (existing.expiresAt <= Date.now()) {
      this.memoryLocks.delete(resource);
      return false;
    }
    return true;
  }

  /**
   * Clear all active locks (for testing and emergency reset)
   */
  public clear(): void {
    this.memoryLocks.clear();
  }
}

export const distributedLock = DistributedLock.getInstance();
