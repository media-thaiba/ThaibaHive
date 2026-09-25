export interface NeuroStreamEvent {
  topic: string; // e.g. 'cluster:telemetry', 'job:logs:<jobId>', 'spot:alerts'
  event: string;
  data: Record<string, any>;
  timestamp: string;
  institutionId: string;
}

export type NeuroStreamSubscriber = (event: NeuroStreamEvent) => void;

export class NeuroStreamManager {
  private static instance: NeuroStreamManager;
  private subscribers: Map<string, Set<NeuroStreamSubscriber>> = new Map();
  private logBuffers: Map<string, string[]> = new Map(); // jobId -> recent log lines

  public static getInstance(): NeuroStreamManager {
    if (!NeuroStreamManager.instance) {
      NeuroStreamManager.instance = new NeuroStreamManager();
    }
    return NeuroStreamManager.instance;
  }

  /**
   * Subscribes a client to a specific topic within a tenant boundary.
   */
  public subscribe(topic: string, tenantId: string, callback: NeuroStreamSubscriber): () => void {
    const key = `${tenantId}:${topic}`;
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      const set = this.subscribers.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.subscribers.delete(key);
      }
    };
  }

  /**
   * Broadcasts an event to all subscribers of a tenant-scoped topic.
   */
  public broadcast(event: NeuroStreamEvent): void {
    const key = `${event.institutionId}:${event.topic}`;
    const set = this.subscribers.get(key);
    if (set) {
      for (const subscriber of set) {
        try {
          subscriber(event);
        } catch {}
      }
    }
  }

  /**
   * Appends stdout/stderr lines to a job log buffer and broadcasts to subscribers.
   */
  public appendJobLog(jobId: string, logLine: string, tenantId: string = 'global'): void {
    const buffer = this.logBuffers.get(jobId) || [];
    buffer.push(logLine);
    if (buffer.length > 500) buffer.shift(); // keep last 500 lines
    this.logBuffers.set(jobId, buffer);

    this.broadcast({
      topic: `job:logs:${jobId}`,
      event: 'log_line',
      data: { jobId, line: logLine },
      timestamp: new Date().toISOString(),
      institutionId: tenantId,
    });
  }

  /**
   * Gets buffered log history for a job.
   */
  public getBufferedLogs(jobId: string): string[] {
    return this.logBuffers.get(jobId) || [];
  }

  public clear(): void {
    this.subscribers.clear();
    this.logBuffers.clear();
  }
}

export const neuroStreamManager = NeuroStreamManager.getInstance();
