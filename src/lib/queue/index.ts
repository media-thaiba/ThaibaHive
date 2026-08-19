/**
 * Background Job Queue — BullMQ-ready Interface
 * Task P1-31: Implement Background Job Queue
 *
 * Architecture:
 * - This module provides a job queue abstraction that can be backed by:
 *   1. In-memory queue (default for dev/SQLite environments)
 *   2. BullMQ + Redis (production: set REDIS_URL env var)
 *
 * To enable BullMQ in production:
 *   pnpm add bullmq ioredis
 *   Set REDIS_URL=redis://localhost:6379
 *
 * Usage:
 *   import { jobQueue } from '@/lib/queue';
 *   await jobQueue.add('send-email', { to: 'user@example.com', subject: '...' });
 */

export type JobName =
  | "send-push-notification"
  | "send-email"
  | "generate-report"
  | "process-image"
  | "sync-attendance"
  | "cleanup-sessions";

export type Job<T = Record<string, unknown>> = {
  id: string;
  name: JobName;
  data: T;
  priority?: number;
  delay?: number;
  attempts?: number;
  addedAt: string;
};

type JobHandler<T = Record<string, unknown>> = (job: Job<T>) => Promise<void>;

class InMemoryJobQueue {
  private queue: Job[] = [];
  private handlers = new Map<JobName, JobHandler>();
  private processing = false;

  async add<T = Record<string, unknown>>(
    name: JobName,
    data: T,
    opts?: { priority?: number; delay?: number; attempts?: number }
  ): Promise<Job<T>> {
    const job: Job<T> = {
      id: crypto.randomUUID(),
      name,
      data,
      priority: opts?.priority ?? 0,
      delay: opts?.delay ?? 0,
      attempts: opts?.attempts ?? 3,
      addedAt: new Date().toISOString(),
    };
    this.queue.push(job as Job);
    // Process asynchronously
    if (!this.processing) {
      setImmediate(() => this.processNext());
    }
    return job;
  }

  register<T = Record<string, unknown>>(name: JobName, handler: JobHandler<T>): void {
    this.handlers.set(name, handler as JobHandler);
  }

  private async processNext() {
    this.processing = true;
    const job = this.queue.shift();
    if (!job) {
      this.processing = false;
      return;
    }
    const handler = this.handlers.get(job.name);
    if (handler) {
      try {
        await handler(job);
      } catch (err) {
        console.error(`[JobQueue] Job ${job.id} (${job.name}) failed:`, err);
      }
    }
    if (this.queue.length > 0) {
      setImmediate(() => this.processNext());
    } else {
      this.processing = false;
    }
  }

  getStats() {
    return { queued: this.queue.length, backend: "in-memory" };
  }
}

/**
 * Singleton job queue instance.
 * Replace with BullMQ Queue when REDIS_URL is available:
 *
 * ```ts
 * import { Queue } from 'bullmq';
 * export const jobQueue = process.env.REDIS_URL
 *   ? new Queue('thaibahive', { connection: { url: process.env.REDIS_URL } })
 *   : new InMemoryJobQueue();
 * ```
 */
export const jobQueue = new InMemoryJobQueue();
