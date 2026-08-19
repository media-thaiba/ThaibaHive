export type DLQJobStatus = "PENDING" | "SUCCESS" | "FAILED" | "QUARANTINED";

export interface DLQJobRecord {
  id: string;
  tenantId: string;
  institutionId?: string;
  jobType: string;
  payload: Record<string, any>;
  errorMessage: string;
  stackTrace?: string;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: string;
  status: DLQJobStatus;
  createdAt: string;
}

export class DLQRetryHandler {
  private queue: Map<string, DLQJobRecord> = new Map();
  private maxAttemptsDefault: number;

  constructor(configOrMaxAttempts: number | { maxAttempts?: number; baseDelayMs?: number } = 5) {
    if (typeof configOrMaxAttempts === "number") {
      this.maxAttemptsDefault = configOrMaxAttempts;
    } else {
      this.maxAttemptsDefault = configOrMaxAttempts.maxAttempts || 5;
    }
  }

  /** Simplified enqueue API for security testing and direct use */
  public async enqueue(params: {
    operationType: string;
    payload: Record<string, any>;
    institutionId?: string;
    tenantId?: string;
  }): Promise<string> {
    const job = this.enqueueFailedJob(
      params.tenantId || params.institutionId || "default",
      params.operationType,
      params.payload,
      "Enqueued for retry",
      undefined
    );
    job.institutionId = params.institutionId;
    return job.id;
  }

  /** Get a single job by ID */
  public getJob(jobId: string): DLQJobRecord | undefined {
    return this.queue.get(jobId);
  }

  /** Get all jobs in the queue */
  public getAllJobs(): DLQJobRecord[] {
    return Array.from(this.queue.values());
  }

  public enqueueFailedJob(
    tenantId: string,
    jobType: string,
    payload: Record<string, any>,
    errorMessage: string,
    stackTrace?: string,
    maxAttempts?: number
  ): DLQJobRecord {
    const jobId = `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const attempts = 1;
    const max = maxAttempts || this.maxAttemptsDefault;

    const nextRetryMs = this.calculateExponentialBackoffMs(attempts);
    const nextRetryAt = new Date(Date.now() + nextRetryMs).toISOString();

    const record: DLQJobRecord = {
      id: jobId,
      tenantId,
      jobType,
      payload,
      errorMessage,
      stackTrace,
      attemptCount: attempts,
      maxAttempts: max,
      nextRetryAt,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    this.queue.set(jobId, record);
    return record;
  }

  public async processRetryJob(
    jobId: string,
    retryExecutor: (payload: Record<string, any>) => Promise<boolean>
  ): Promise<{ success: boolean; status: DLQJobStatus; error?: string }> {
    const job = this.queue.get(jobId);
    if (!job) {
      return { success: false, status: "FAILED", error: `Job ${jobId} not found` };
    }

    if (job.status === "QUARANTINED" || job.status === "SUCCESS") {
      return { success: false, status: job.status, error: `Job ${jobId} is ${job.status}` };
    }

    job.attemptCount += 1;
    try {
      const result = await retryExecutor(job.payload);
      if (result) {
        job.status = "SUCCESS";
        return { success: true, status: "SUCCESS" };
      } else {
        return this.handleRetryFailure(job, "Retry executor returned false");
      }
    } catch (error) {
      return this.handleRetryFailure(job, error instanceof Error ? error.message : "Retry failed");
    }
  }

  public quarantineJob(jobId: string): boolean {
    const job = this.queue.get(jobId);
    if (!job) return false;
    job.status = "QUARANTINED";
    return true;
  }

  public getJobs(tenantId?: string, status?: DLQJobStatus): DLQJobRecord[] {
    const list = Array.from(this.queue.values());
    return list.filter((job) => {
      if (tenantId && job.tenantId !== tenantId) return false;
      if (status && job.status !== status) return false;
      return true;
    });
  }

  public calculateExponentialBackoffMs(attempt: number): number {
    const baseBackoff = Math.pow(2, attempt) * 1000;
    const jitter = Math.floor(Math.random() * 200);
    return baseBackoff + jitter;
  }

  private handleRetryFailure(job: DLQJobRecord, errorMsg: string): { success: boolean; status: DLQJobStatus; error: string } {
    job.errorMessage = errorMsg;
    if (job.attemptCount >= job.maxAttempts) {
      job.status = "QUARANTINED";
      return { success: false, status: "QUARANTINED", error: `Max retries (${job.maxAttempts}) reached. Quarantined.` };
    }

    const nextMs = this.calculateExponentialBackoffMs(job.attemptCount);
    job.nextRetryAt = new Date(Date.now() + nextMs).toISOString();
    job.status = "PENDING";

    return { success: false, status: "PENDING", error: errorMsg };
  }
}
