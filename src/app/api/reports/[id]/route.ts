import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  dailyReports,
  dailyReportTasks,
  tasks,
  auditLog,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, inArray } from "drizzle-orm";
import { canAccessStaff } from "@/lib/auth/department-scope";
import { dailyReportUpdateSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { withReportLock } from "@/lib/reports/ledger";

export const GET = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const { role, staffId } = session;

  const report = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.id, id))
    .get();
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Super admin, admin bypass all checks (if admin, can view within institution via canAccessStaff)
  if (role !== "super_admin") {
    const hasAccess = await canAccessStaff(staffId, role, report.staffId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (report.staffId !== staffId && report.status === "draft") {
      return NextResponse.json(
        { error: "Cannot view draft reports" },
        { status: 403 }
      );
    }
  }

  const reportTasks = await db
    .select()
    .from(dailyReportTasks)
    .where(eq(dailyReportTasks.reportId, id))
    .all();

  return NextResponse.json({ report, tasks: reportTasks });
}, "reports:read");

export const PUT = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = dailyReportUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { summary, status, tasks: reportTasks } = parsed.data;

  return await withReportLock(id, async () => {
    const report = await db
      .select()
      .from(dailyReports)
      .where(eq(dailyReports.id, id))
      .get();

    if (!report) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Ownership check: only report owner can edit
    if (report.staffId !== session.staffId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only edit draft or rejected reports
    if (report.status !== "draft" && report.status !== "rejected") {
      return NextResponse.json(
        { error: "Only draft or rejected reports can be edited" },
        { status: 400 }
      );
    }

    // Validate hours
    if (reportTasks?.length) {
      const totalHours = reportTasks.reduce(
        (sum: number, t: { hoursSpent?: number }) => sum + (t.hoursSpent || 0),
        0
      );
      if (totalHours > 24) {
        return NextResponse.json(
          { error: "Total hours for a single day cannot exceed 24.0" },
          { status: 400 }
        );
      }
    }

    // Validate task ownership
    if (reportTasks?.length) {
      const taskIds = reportTasks
        .map((t: { taskId?: string | null }) => t.taskId)
        .filter((tid): tid is string => typeof tid === "string" && tid.length > 0);
      if (taskIds.length > 0) {
        const ownedTasks = await db
          .select({ id: tasks.id })
          .from(tasks)
          .where(
            and(
              inArray(tasks.id, taskIds),
              eq(tasks.assignedToId, session.staffId)
            )
          )
        .all();
        const ownedIds = new Set(ownedTasks.map((t) => t.id));
        for (const tid of taskIds) {
          if (!ownedIds.has(tid)) {
            return NextResponse.json(
              { error: `Task ${tid} is not assigned to you` },
              { status: 403 }
            );
          }
        }
      }
    }

    const newStatus = status === "draft" ? "draft" : status === "submitted" ? "submitted" : report.status;
    const now = new Date().toISOString();

    try {
      await db.transaction(async (tx) => {
        await tx.update(dailyReports)
          .set({
            summary: summary !== undefined ? summary : report.summary,
            status: newStatus,
            updatedAt: now,
          })
          .where(eq(dailyReports.id, id))
          .run();

        // Handle resubmission of rejected report
        if (report.status === "rejected" && newStatus === "submitted") {
          await tx.insert(auditLog)
            .values({
              id: crypto.randomUUID(),
              staffId: session.staffId,
              action: "report_resubmitted",
              entityType: "daily_report",
              entityId: id,
              details: {
                previousStatus: "rejected",
                newStatus: "submitted",
              },
              createdAt: now,
            })
            .run();
        }

        // Replace tasks
        if (reportTasks !== undefined) {
          await tx.delete(dailyReportTasks)
            .where(eq(dailyReportTasks.reportId, id))
            .run();

          if (reportTasks.length) {
            await tx.insert(dailyReportTasks)
              .values(
                reportTasks.map((t) => ({
                  id: crypto.randomUUID(),
                  reportId: id,
                  taskId: t.taskId || null,
                  description: t.description,
                  hoursSpent: t.hoursSpent || 0,
                  status: t.status || "completed",
                }))
              )
              .run();

            for (const t of reportTasks) {
              if (t.taskId && t.status === "completed") {
                await tx.update(tasks)
                  .set({ status: "completed", completedAt: now, updatedAt: now })
                  .where(eq(tasks.id, t.taskId))
                  .run();
              }
            }
          }
        }
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (
        error.message.includes("UNIQUE constraint failed") ||
        (err !== null && typeof err === "object" && "code" in err && (err as { code: string }).code === "SQLITE_CONSTRAINT_UNIQUE")
      ) {
        return NextResponse.json(
          { error: "A report for this date already exists." },
          { status: 400 }
        );
      }
      throw err;
    }

    const updated = await db
      .select()
      .from(dailyReports)
      .where(eq(dailyReports.id, id))
      .get();

    return NextResponse.json({ report: updated });
  });
}, "reports:create");

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;

  return await withReportLock(id, async () => {
    const report = await db
      .select()
      .from(dailyReports)
      .where(eq(dailyReports.id, id))
      .get();

    if (!report) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only creator can delete, or super_admin
    if (session.role !== "super_admin" && report.staffId !== session.staffId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only draft reports can be deleted/withdrawn
    if (session.role !== "super_admin" && report.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft reports can be deleted. Submitted or reviewed reports cannot be deleted." },
        { status: 400 }
      );
    }

    await db.delete(dailyReportTasks).where(eq(dailyReportTasks.reportId, id)).run();
    await db.delete(dailyReports).where(eq(dailyReports.id, id)).run();

    return NextResponse.json({ success: true });
  });
}, "reports:create");
