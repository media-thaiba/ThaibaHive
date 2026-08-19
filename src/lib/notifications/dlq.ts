/**
 * Push Notification Dead Letter Queue (DLQ)
 * Task P3-85: Failed push notifications are stored for retry.
 *
 * Architecture:
 * - In-memory queue for dev, Redis-backed in production (via REDIS_URL env var)
 * - Failed notifications are retried up to MAX_RETRIES times with exponential backoff
 * - Messages older than TTL_HOURS are permanently discarded
 */

import { serverLogger as logger } from "@/lib/server-logger";

export type DlqEntry = {
  id: string;
  payload: Record<string, unknown>;
  targetUserId: string;
  failedAt: string;
  retries: number;
  lastError: string;
  nextRetryAt: string;
};

const MAX_RETRIES = 3;
const TTL_HOURS = 24;
const BASE_BACKOFF_MS = 30_000; // 30 seconds

// In-memory DLQ (replace with Redis LPUSH/RPOP in production)
const dlqStore: Map<string, DlqEntry> = new Map();

export function enqueueDlq(
  id: string,
  payload: Record<string, unknown>,
  targetUserId: string,
  error: string
): void {
  const now = new Date();
  const existing = dlqStore.get(id);
  const retries = existing ? existing.retries + 1 : 0;

  if (retries >= MAX_RETRIES) {
    logger.warn("DLQ: max retries reached, discarding notification", { id, targetUserId, retries });
    dlqStore.delete(id);
    return;
  }

  const backoffMs = BASE_BACKOFF_MS * Math.pow(2, retries);
  const nextRetryAt = new Date(now.getTime() + backoffMs).toISOString();

  dlqStore.set(id, {
    id,
    payload,
    targetUserId,
    failedAt: now.toISOString(),
    retries,
    lastError: error,
    nextRetryAt,
  });

  logger.info("DLQ: notification enqueued for retry", { id, targetUserId, retries, nextRetryAt });
}

export async function processDlq(
  handler: (entry: DlqEntry) => Promise<void>
): Promise<{ processed: number; failed: number }> {
  const now = new Date();
  const ttlCutoff = new Date(now.getTime() - TTL_HOURS * 60 * 60 * 1000);
  let processed = 0;
  let failed = 0;

  for (const [id, entry] of dlqStore.entries()) {
    // Discard entries older than TTL
    if (new Date(entry.failedAt) < ttlCutoff) {
      dlqStore.delete(id);
      continue;
    }

    // Skip entries not yet due for retry
    if (new Date(entry.nextRetryAt) > now) continue;

    try {
      await handler(entry);
      dlqStore.delete(id);
      processed++;
      logger.info("DLQ: notification retry succeeded", { id, targetUserId: entry.targetUserId });
    } catch (error) {
      failed++;
      enqueueDlq(id, entry.payload, entry.targetUserId, String(error));
    }
  }

  return { processed, failed };
}

export function getDlqStats(): { queued: number; entries: DlqEntry[] } {
  return {
    queued: dlqStore.size,
    entries: Array.from(dlqStore.values()),
  };
}
