export interface DLQEvent {
  id: string;
  gatewayName: string;
  rawBody: string;
  signature: string;
  headers?: Record<string, string>;
  errorReason: string;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'replayed' | 'abandoned';
  firstReceivedAt: string;
  lastAttemptedAt: string;
  nextRetryAt: string;
}

export class DLQManager {
  private static instance: DLQManager;
  private queue: Map<string, DLQEvent> = new Map();

  public static getInstance(): DLQManager {
    if (!DLQManager.instance) {
      DLQManager.instance = new DLQManager();
    }
    return DLQManager.instance;
  }

  public clearQueue(): void {
    this.queue.clear();
  }

  public async enqueue(
    gatewayName: string,
    rawBody: string,
    signature: string,
    errorReason: string,
    headers?: Record<string, string>,
    maxRetries: number = 5
  ): Promise<DLQEvent> {
    const id = `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    const nextRetry = new Date(Date.now() + 60 * 1000).toISOString(); // 1 min backoff

    const event: DLQEvent = {
      id,
      gatewayName,
      rawBody,
      signature,
      headers,
      errorReason,
      retryCount: 0,
      maxRetries,
      status: 'pending',
      firstReceivedAt: now,
      lastAttemptedAt: now,
      nextRetryAt: nextRetry,
    };

    this.queue.set(id, event);
    return event;
  }

  public async listPendingEvents(): Promise<DLQEvent[]> {
    return Array.from(this.queue.values()).filter((e) => e.status === 'pending');
  }

  public async getEventById(id: string): Promise<DLQEvent | null> {
    return this.queue.get(id) || null;
  }

  public async replayEvent(
    id: string,
    handler: (event: DLQEvent) => Promise<boolean>
  ): Promise<boolean> {
    const event = this.queue.get(id);
    if (!event || event.status !== 'pending') return false;

    event.retryCount += 1;
    event.lastAttemptedAt = new Date().toISOString();

    try {
      const success = await handler(event);
      if (success) {
        event.status = 'replayed';
        return true;
      }
    } catch (err: any) {
      event.errorReason = err?.message || 'Replay failure';
    }

    if (event.retryCount >= event.maxRetries) {
      event.status = 'abandoned';
    } else {
      // Exponential backoff
      const delaySec = Math.pow(2, event.retryCount) * 60;
      event.nextRetryAt = new Date(Date.now() + delaySec * 1000).toISOString();
    }

    return false;
  }
}
