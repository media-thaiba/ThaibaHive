import { LiveSessionProvider } from "./provider";

export interface KeyframeItem {
  jpegBase64: string;
  mimeType: string;
  timestamp: number;
}

export class KeyframeQueue {
  private items: KeyframeItem[] = [];
  private capacity: number;
  private droppedCount = 0;

  constructor(capacity: number = 5) {
    this.capacity = capacity;
  }

  public enqueue(item: KeyframeItem): boolean {
    let dropped = false;
    if (this.items.length >= this.capacity) {
      this.items.shift(); // Drop oldest frame (bounded queue backpressure)
      this.droppedCount++;
      dropped = true;
    }
    this.items.push(item);
    return dropped;
  }

  public dequeue(): KeyframeItem | undefined {
    return this.items.shift();
  }

  public peek(): KeyframeItem | undefined {
    return this.items[0];
  }

  public size(): number {
    return this.items.length;
  }

  public getDroppedCount(): number {
    return this.droppedCount;
  }

  public clear(): void {
    this.items = [];
    this.droppedCount = 0;
  }
}

export class KeyframePipeline {
  private queue: KeyframeQueue;
  private provider: LiveSessionProvider;
  private intervalMs: number;
  private lastSentTime = 0;
  private totalFramesProcessed = 0;
  private isProcessing = false;

  constructor(
    provider: LiveSessionProvider,
    options?: { intervalSeconds?: number; queueCapacity?: number }
  ) {
    this.provider = provider;
    this.intervalMs = (options?.intervalSeconds ?? 1) * 1000;
    this.queue = new KeyframeQueue(options?.queueCapacity ?? 5);
  }

  /**
   * Ingest a frame into the bounded queue.
   * Enforces drop-oldest when queue overflows.
   */
  public async ingestFrame(jpegBase64: string, mimeType: string = "image/jpeg"): Promise<{ queued: boolean; droppedOldest: boolean }> {
    const item: KeyframeItem = {
      jpegBase64,
      mimeType,
      timestamp: Date.now(),
    };

    const droppedOldest = this.queue.enqueue(item);
    this.processQueue();
    return { queued: true, droppedOldest };
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.size() > 0) {
        const item = this.queue.dequeue();
        if (!item) break;

        await this.provider.sendKeyframe(item.jpegBase64, item.mimeType);
        this.totalFramesProcessed++;
        this.lastSentTime = Date.now();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  public getTotalFramesProcessed(): number {
    return this.totalFramesProcessed;
  }

  public getDroppedFramesCount(): number {
    return this.queue.getDroppedCount();
  }

  public getQueueSize(): number {
    return this.queue.size();
  }
}
