import { db } from "@/db";
import { reportSchedules, reportHistory, scheduledJobs, jobExecutions } from "@thaiba/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { ReportGeneratorService } from "./report-generator";
import crypto from "crypto";

export interface QueueJob {
  id: string;
  institutionId: string;
  type: "attendance" | "finance" | "academics";
  format: "pdf" | "excel";
  options: any;
  status: "queued" | "processing" | "success" | "failed";
  error?: string;
}

export class ReportQueue {
  private static MAX_CONCURRENCY = 2;
  private static isProcessing = false;

  static async addJob(jobData: Omit<QueueJob, "id" | "status">): Promise<string> {
    const id = crypto.randomUUID();
    await db
      .insert(scheduledJobs)
      .values({
        id,
        institutionId: jobData.institutionId,
        type: jobData.type,
        format: jobData.format,
        options: JSON.stringify(jobData.options),
        status: "queued",
      })
      .run();

    // Trigger processing asynchronously
    this.processQueue().catch((e) => console.error("[ReportQueue] Trigger queue error:", e));
    this.publishQueueMetrics().catch(() => {});
    return id;
  }

  static async getJobStatus(id: string): Promise<QueueJob | undefined> {
    const row = await db.select().from(scheduledJobs).where(eq(scheduledJobs.id, id)).get();
    if (!row) return undefined;
    return {
      id: row.id,
      institutionId: row.institutionId,
      type: row.type as any,
      format: row.format as any,
      options: JSON.parse(row.options),
      status: row.status as any,
      error: row.error || undefined,
    };
  }

  static async getQueue(): Promise<QueueJob[]> {
    const rows = await db
      .select()
      .from(scheduledJobs)
      .where(sql`${scheduledJobs.status} IN ('queued', 'processing')`)
      .all();

    return rows.map((row) => ({
      id: row.id,
      institutionId: row.institutionId,
      type: row.type as any,
      format: row.format as any,
      options: JSON.parse(row.options),
      status: row.status as any,
      error: row.error || undefined,
    }));
  }

  public static async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        // Count active processing jobs
        const activeResult = await db
          .select({ count: sql<number>`count(${scheduledJobs.id})` })
          .from(scheduledJobs)
          .where(eq(scheduledJobs.status, "processing"))
          .get();
        const activeCount = activeResult?.count ?? 0;

        if (activeCount >= this.MAX_CONCURRENCY) {
          break;
        }

        // Fetch next queued job
        const nextJob = await db
          .select()
          .from(scheduledJobs)
          .where(eq(scheduledJobs.status, "queued"))
          .orderBy(scheduledJobs.createdAt)
          .limit(1)
          .get();

        if (!nextJob) {
          break;
        }

        // Try to atomically claim the job using Optimistic Locking
        const updateResult = await db
          .update(scheduledJobs)
          .set({
            status: "processing",
            updatedAt: new Date().toISOString(),
          })
          .where(and(eq(scheduledJobs.id, nextJob.id), eq(scheduledJobs.status, "queued")))
          .run();

        // If changes === 0, someone else got it. Continue loop.
        const changes = (updateResult as any).rowsAffected ?? (updateResult as any).changes ?? 0;
        if (changes === 0) {
          continue;
        }

        // Successfully claimed! Run execution in background (non-blocking)
        import("@/lib/observability/event-bus")
          .then(({ EventBus }) => {
            EventBus.getInstance().publishEvent({
              eventSource: "report-queue",
              severity: "info",
              message: `Job ${nextJob.id} of type ${nextJob.type} transition to processing.`,
            });
          })
          .catch(() => {});
        this.publishQueueMetrics().catch(() => {});

        this.executeJob(nextJob).catch((e) => {
          console.error(`[ReportQueue] Unhandled job execution error for ${nextJob.id}:`, e);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private static async executeJob(job: any) {
    const executionId = crypto.randomUUID();
    const options = JSON.parse(job.options);

    // Write to job_executions log
    await db
      .insert(jobExecutions)
      .values({
        id: executionId,
        jobId: job.id,
        status: "processing",
        retryCount: 0,
        startedAt: new Date().toISOString(),
      })
      .run();

    try {
      console.log(`[ReportQueue] Processing job ${job.id} (${job.type} - ${job.format})...`);
      const result = await ReportGeneratorService.generateReport(
        job.institutionId,
        job.type as any,
        job.format as any,
        { ...options, scheduleId: options.scheduleId }
      );

      // Success updates
      await db
        .update(scheduledJobs)
        .set({
          status: "success",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(scheduledJobs.id, job.id))
        .run();

      await db
        .update(jobExecutions)
        .set({
          status: "success",
          completedAt: new Date().toISOString(),
        })
        .where(eq(jobExecutions.id, executionId))
        .run();

      import("@/lib/observability/event-bus")
        .then(({ EventBus }) => {
          EventBus.getInstance().publishEvent({
            eventSource: "report-queue",
            severity: "info",
            message: `Job ${job.id} of type ${job.type} execution completed successfully.`,
          });
        })
        .catch(() => {});
      this.publishQueueMetrics().catch(() => {});

      console.log(`[ReportQueue] Report ${job.id} generated. File saved at ${result.filePath}.`);
    } catch (err: any) {
      console.error(`[ReportQueue] Job ${job.id} failed:`, err);
      const errMsg = err.message || String(err);

      // Count prior failures to determine retry status
      const prevExecutions = await db
        .select({ count: sql<number>`count(${jobExecutions.id})` })
        .from(jobExecutions)
        .where(eq(jobExecutions.jobId, job.id))
        .get();
      const attemptsCount = prevExecutions?.count ?? 1;

      await db
        .update(jobExecutions)
        .set({
          status: "failed",
          completedAt: new Date().toISOString(),
          errorMessage: errMsg,
        })
        .where(eq(jobExecutions.id, executionId))
        .run();

      if (attemptsCount < 3) {
        // Re-queue with exponential backoff (2^attemptsCount seconds)
        const backoffMs = Math.pow(2, attemptsCount) * 1000;
        console.log(`[ReportQueue] Job ${job.id} failed. Retrying in ${backoffMs}ms (Attempt ${attemptsCount + 1})...`);

        await db
          .update(scheduledJobs)
          .set({
            status: "queued",
            error: errMsg,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(scheduledJobs.id, job.id))
          .run();

        import("@/lib/observability/event-bus")
          .then(({ EventBus }) => {
            EventBus.getInstance().publishEvent({
              eventSource: "report-queue",
              severity: "warning",
              message: `Job ${job.id} of type ${job.type} execution failed (retry attempt ${attemptsCount + 1}).`,
            });
          })
          .catch(() => {});
        this.publishQueueMetrics().catch(() => {});

        setTimeout(() => {
          this.processQueue().catch((e) => console.error("[ReportQueue] Backoff trigger error:", e));
        }, backoffMs);
      } else {
        // Mark hard failure
        await db
          .update(scheduledJobs)
          .set({
            status: "failed",
            error: errMsg,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(scheduledJobs.id, job.id))
          .run();

        import("@/lib/observability/event-bus")
          .then(({ EventBus }) => {
            EventBus.getInstance().publishEvent({
              eventSource: "report-queue",
              severity: "error",
              message: `Job ${job.id} of type ${job.type} execution failed with error: ${errMsg}`,
            });
          })
          .catch(() => {});
        this.publishQueueMetrics().catch(() => {});
      }
    } finally {
      // Trigger execution of the next queued job
      this.processQueue().catch((e) => console.error("[ReportQueue] Finally trigger error:", e));
    }
  }

  public static async publishQueueMetrics() {
    try {
      const { EventBus } = await import("@/lib/observability/event-bus");
      
      const backlogResult = await db
        .select({ count: sql<number>`count(${scheduledJobs.id})` })
        .from(scheduledJobs)
        .where(sql`${scheduledJobs.status} IN ('queued', 'paused')`)
        .get();
      const backlogCount = backlogResult?.count ?? 0;

      const processingResult = await db
        .select({ count: sql<number>`count(${scheduledJobs.id})` })
        .from(scheduledJobs)
        .where(eq(scheduledJobs.status, "processing"))
        .get();
      const processingCount = processingResult?.count ?? 0;

      const retryResult = await db
        .select({ count: sql<number>`count(${jobExecutions.id})` })
        .from(jobExecutions)
        .where(sql`${jobExecutions.retryCount} > 0`)
        .get();
      const retryCount = retryResult?.count ?? 0;

      const bus = EventBus.getInstance();
      bus.publishMetric({
        nodeId: "report-queue-node",
        metricName: "queue_backlog_size",
        metricValue: backlogCount,
      });

      bus.publishMetric({
        nodeId: "report-queue-node",
        metricName: "worker_concurrency_load",
        metricValue: processingCount,
      });

      bus.publishMetric({
        nodeId: "report-queue-node",
        metricName: "job_failure_retry_rate",
        metricValue: retryCount,
      });
    } catch (e) {
      console.error("[ReportQueue] Failed to publish queue metrics:", e);
    }
  }
}

export async function checkAndRunScheduledReports() {
  try {
    console.log("[Scheduler] Checking for pending report schedules...");
    const activeSchedules = await db
      .select()
      .from(reportSchedules)
      .where(eq(reportSchedules.isActive, true))
      .all();

    for (const schedule of activeSchedules) {
      const lastRun = await db
        .select()
        .from(reportHistory)
        .where(eq(reportHistory.scheduleId, schedule.id))
        .orderBy(desc(reportHistory.generatedAt))
        .limit(1)
        .get();

      let isDue = false;
      if (!lastRun) {
        isDue = true;
      } else {
        const lastRunTime = new Date(lastRun.generatedAt).getTime();
        const now = Date.now();
        const diffMs = now - lastRunTime;

        if (schedule.frequency === "daily" && diffMs >= 24 * 60 * 60 * 1000) {
          isDue = true;
        } else if (schedule.frequency === "weekly" && diffMs >= 7 * 24 * 60 * 60 * 1000) {
          isDue = true;
        } else if (schedule.frequency === "monthly" && diffMs >= 30 * 24 * 60 * 60 * 1000) {
          isDue = true;
        }
      }

      if (isDue) {
        // Enforce safety boundary: check if there's already a queued or processing job for this schedule
        const activeJobs = await db
          .select()
          .from(scheduledJobs)
          .where(
            and(
              eq(scheduledJobs.institutionId, schedule.institutionId),
              sql`${scheduledJobs.options} LIKE ${"%" + schedule.id + "%"}`
            )
          )
          .all();

        const isAlreadyActive = activeJobs.some(
          (job) => job.status === "queued" || job.status === "processing"
        );

        if (isAlreadyActive) {
          console.log(`[Scheduler] Report schedule ${schedule.id} is already queued or processing. Skipping.`);
          continue;
        }

        console.log(`[Scheduler] Schedule ${schedule.id} ("${schedule.title}") is due. Queueing report generation...`);

        let type: "attendance" | "finance" | "academics" = "attendance";
        const titleLower = schedule.title.toLowerCase();
        if (titleLower.includes("finance") || titleLower.includes("budget") || titleLower.includes("account")) {
          type = "finance";
        } else if (titleLower.includes("academic") || titleLower.includes("grade") || titleLower.includes("mark")) {
          type = "academics";
        }

        let recipients: string[] = [];
        try {
          recipients = JSON.parse(schedule.recipients);
        } catch {
          recipients = [schedule.recipients];
        }

        await ReportQueue.addJob({
          institutionId: schedule.institutionId,
          type,
          format: schedule.format as "pdf" | "excel",
          options: {
            scheduleId: schedule.id,
            recipients,
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            endDate: new Date().toISOString().split("T")[0],
          },
        });
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error checking report schedules:", error);
  }
}
