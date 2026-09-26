import { CrossRegionReplicationPayload } from "./types";

export interface SyncQueueItem {
  id: string;
  payload: CrossRegionReplicationPayload;
  targetRegion: string;
  attempts: number;
  maxAttempts: number;
  status: "PENDING" | "PROCESSING" | "ACKNOWLEDGED" | "FAILED";
  nextRetryAt: number;
  createdAt: number;
}

export class CrossRegionSyncQueue {
  private queue: Map<string, SyncQueueItem> = new Map();
  private processedIds: Set<string> = new Set(); // Idempotency deduplication

  public enqueue(payload: CrossRegionReplicationPayload, maxAttempts: number = 5): SyncQueueItem {
    const item: SyncQueueItem = {
      id: payload.id,
      payload,
      targetRegion: payload.targetRegion,
      attempts: 0,
      maxAttempts,
      status: "PENDING",
      nextRetryAt: Date.now(),
      createdAt: Date.now(),
    };

    this.queue.set(item.id, item);
    return item;
  }

  public getPendingItems(targetRegion?: string): SyncQueueItem[] {
    const now = Date.now();
    return Array.from(this.queue.values()).filter((item) => {
      const regionMatch = targetRegion ? item.targetRegion === targetRegion : true;
      return regionMatch && item.status === "PENDING" && item.nextRetryAt <= now;
    });
  }

  public markProcessing(id: string): void {
    const item = this.queue.get(id);
    if (item) {
      item.status = "PROCESSING";
      item.attempts += 1;
    }
  }

  public acknowledge(id: string): void {
    const item = this.queue.get(id);
    if (item) {
      item.status = "ACKNOWLEDGED";
      this.processedIds.add(id);
    }
  }

  public markFailed(id: string, _errorMessage?: string): void {
    const item = this.queue.get(id);
    if (!item) return;

    if (item.attempts >= item.maxAttempts) {
      item.status = "FAILED";
    } else {
      item.status = "PENDING";
      // Exponential backoff: 2s, 4s, 8s, 16s...
      const backoffMs = Math.pow(2, item.attempts) * 1000;
      item.nextRetryAt = Date.now() + backoffMs;
    }
  }

  public isAlreadyProcessed(id: string): boolean {
    return this.processedIds.has(id);
  }

  public getQueueStats() {
    const items = Array.from(this.queue.values());
    return {
      total: items.length,
      pending: items.filter((i) => i.status === "PENDING").length,
      processing: items.filter((i) => i.status === "PROCESSING").length,
      acknowledged: items.filter((i) => i.status === "ACKNOWLEDGED").length,
      failed: items.filter((i) => i.status === "FAILED").length,
    };
  }
}
