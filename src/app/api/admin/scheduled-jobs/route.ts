import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/db";
import { scheduledJobs, jobExecutions } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { jobFilterSchema, jobTriggerSchema } from "@/lib/validation/schemas";
import { ReportQueue } from "@/lib/services/report-queue";
import { PreferenceAuditService } from "@/lib/services/preference-audit";

async function getHandler(request: Request, session: any) {
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: Access restricted to super_admin operators only" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const paramsObj = Object.fromEntries(searchParams.entries());
  
  const parseResult = jobFilterSchema.safeParse(paramsObj);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.message }, { status: 400 });
  }

  const { status, type, institutionId, limit, offset } = parseResult.data;

  try {
    const conditions = [];
    if (status) conditions.push(eq(scheduledJobs.status, status));
    if (type) conditions.push(eq(scheduledJobs.type, type));
    if (institutionId) conditions.push(eq(scheduledJobs.institutionId, institutionId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch the jobs with their execution details
    const jobs = await db
      .select({
        id: scheduledJobs.id,
        institutionId: scheduledJobs.institutionId,
        type: scheduledJobs.type,
        format: scheduledJobs.format,
        options: scheduledJobs.options,
        status: scheduledJobs.status,
        error: scheduledJobs.error,
        createdAt: scheduledJobs.createdAt,
        updatedAt: scheduledJobs.updatedAt,
      })
      .from(scheduledJobs)
      .where(whereClause)
      .orderBy(desc(scheduledJobs.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    // For each job, fetch its executions from job_executions
    const jobsWithExecutions = await Promise.all(
      jobs.map(async (job) => {
        const executions = await db
          .select()
          .from(jobExecutions)
          .where(eq(jobExecutions.jobId, job.id))
          .orderBy(desc(jobExecutions.startedAt))
          .all();
        return {
          ...job,
          options: typeof job.options === "string" ? JSON.parse(job.options) : job.options,
          executions,
        };
      })
    );

    return NextResponse.json({ jobs: jobsWithExecutions });
  } catch (err) {
    console.error("[Scheduled Jobs API] Failed to fetch scheduled jobs:", err);
    return NextResponse.json({ error: "Failed to fetch scheduled jobs" }, { status: 500 });
  }
}

async function postHandler(request: Request, session: any) {
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: Access restricted to super_admin operators only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parseResult = jobTriggerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.message }, { status: 400 });
    }

    const { type, format, options, institutionId } = parseResult.data;

    // options can be a parsed object or string. Stringify for database storage.
    const optionsStr = typeof options === "string" ? options : JSON.stringify(options);

    const jobId = await ReportQueue.addJob({
      institutionId,
      type,
      format,
      options: JSON.parse(optionsStr),
    });

    const newJob = await db
      .select()
      .from(scheduledJobs)
      .where(eq(scheduledJobs.id, jobId))
      .get();

    // Log administrative action to preferences audit log
    await PreferenceAuditService.logPreferenceChange(
      session.staffId,
      `job_trigger:${jobId}`,
      "",
      JSON.stringify({ type, format, institutionId }),
      session.institutionId || "",
      request.headers.get("x-forwarded-for") || "127.0.0.1"
    );

    return NextResponse.json({ success: true, job: newJob }, { status: 201 });
  } catch (err) {
    console.error("[Scheduled Jobs API] Failed to trigger manual job:", err);
    return NextResponse.json({ error: "Failed to trigger manual job" }, { status: 500 });
  }
}

export const GET = requireAuth(getHandler, "system:telemetry");
export const POST = requireAuth(postHandler, "system:telemetry");
