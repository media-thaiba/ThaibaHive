import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/db";
import { scheduledJobs, jobExecutions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { jobUpdateSchema } from "@/lib/validation/schemas";
import { ReportQueue } from "@/lib/services/report-queue";
import { PreferenceAuditService } from "@/lib/services/preference-audit";

async function patchHandler(
  request: Request,
  session: any,
  context?: { params: Promise<Record<string, string>> }
) {
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: Access restricted to super_admin operators only" }, { status: 403 });
  }

  if (!context || !context.params) {
    return NextResponse.json({ error: "Missing route parameters" }, { status: 400 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parseResult = jobUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.message }, { status: 400 });
    }

    const { status } = parseResult.data;

    // Fetch the existing job
    const job = await db
      .select()
      .from(scheduledJobs)
      .where(eq(scheduledJobs.id, id))
      .get();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const oldStatus = job.status;

    // Validate state transitions
    if (status === "paused") {
      if (oldStatus !== "queued") {
        return NextResponse.json({ error: `Cannot pause a job with status ${oldStatus}` }, { status: 400 });
      }

      await db
        .update(scheduledJobs)
        .set({ status: "paused", updatedAt: sql`current_timestamp` })
        .where(eq(scheduledJobs.id, id))
        .run();
    } else if (status === "queued") {
      // Resume
      if (oldStatus !== "paused") {
        return NextResponse.json({ error: `Cannot resume a job with status ${oldStatus}` }, { status: 400 });
      }

      await db
        .update(scheduledJobs)
        .set({ status: "queued", updatedAt: sql`current_timestamp` })
        .where(eq(scheduledJobs.id, id))
        .run();

      // Trigger the queue worker asynchronously
      ReportQueue.processQueue().catch((e) => console.error("[ReportQueue] Resume queue trigger error:", e));
    } else if (status === "cancelled") {
      if (oldStatus !== "queued" && oldStatus !== "processing" && oldStatus !== "paused") {
        return NextResponse.json({ error: `Cannot cancel a job with status ${oldStatus}` }, { status: 400 });
      }

      await db
        .update(scheduledJobs)
        .set({ status: "cancelled", error: "Cancelled by administrator", updatedAt: sql`current_timestamp` })
        .where(eq(scheduledJobs.id, id))
        .run();

      // If it was processing, update active executions to failed
      if (oldStatus === "processing") {
        await db
          .update(jobExecutions)
          .set({
            status: "failed",
            completedAt: sql`current_timestamp`,
            errorMessage: "Cancelled by administrator",
          })
          .where(eq(jobExecutions.jobId, id))
          .run();
      }

      // Emit cancellation event to EventBus
      try {
        const { EventBus } = await import("@/lib/observability/event-bus");
        EventBus.getInstance().publishEvent({
          eventSource: "report-queue",
          severity: "warning",
          message: `Job ${id} cancelled by administrative operator`,
        });

        // Also publish updated queue metrics immediately
        ReportQueue.publishQueueMetrics().catch(() => {});
      } catch (e) {
        console.error("[Scheduled Jobs PATCH] Failed to publish cancellation event:", e);
      }
    }

    // Log administrative action to preferences audit log
    await PreferenceAuditService.logPreferenceChange(
      session.staffId,
      `job_status_change:${id}`,
      JSON.stringify({ status: oldStatus }),
      JSON.stringify({ status }),
      session.institutionId || null,
      request.headers.get("x-forwarded-for") || "127.0.0.1"
    );

    return NextResponse.json({ success: true, oldStatus, newStatus: status });
  } catch (err) {
    console.error("[Scheduled Jobs API] Failed to update job status:", err);
    return NextResponse.json({ error: "Failed to update job status" }, { status: 500 });
  }
}

export const PATCH = requireAuth(patchHandler, "system:telemetry");
