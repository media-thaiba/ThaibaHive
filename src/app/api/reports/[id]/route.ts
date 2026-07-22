import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  dailyReports,
  dailyReportTasks,
  tasks,
  staffDepartments,
  departments,
  auditLog,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, inArray } from "drizzle-orm";
import { canAccessStaff } from "@/lib/auth/department-scope";


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

  // Super admin, admin bypass all checks
  if (role !== "super_admin" && role !== "admin") {
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
  const { id } = await context!.params;
  const body = await request.json();
  const { summary, status, tasks: reportTasks } = body;

  const report = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.id, id))
    .get();

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ownership check
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
    for (const t of reportTasks) {
      if (
        t.hoursSpent !== undefined &&
        t.hoursSpent !== null &&
        (t.hoursSpent < 0.1 || t.hoursSpent > 24)
      ) {
        return NextResponse.json(
          { error: "Hours spent must be between 0.1 and 24.0" },
          { status: 400 }
        );
      }
    }
    const totalHours = reportTasks.reduce(
      (sum: number, t: any) => sum + (t.hoursSpent || 0),
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
      .map((t: any) => t.taskId)
      .filter(Boolean);
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
    await db.transaction(async () => {
      await db.update(dailyReports)
        .set({
          summary,
          status: newStatus,
          updatedAt: now,
        })
        .where(eq(dailyReports.id, id))
        .run();

      // Handle resubmission of rejected report
      if (report.status === "rejected" && newStatus === "submitted") {
        await db.insert(auditLog)
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
        await db.delete(dailyReportTasks)
          .where(eq(dailyReportTasks.reportId, id))
          .run();

        if (reportTasks.length) {
          db.insert(dailyReportTasks)
            .values(
              reportTasks.map((t: any) => ({
                id: crypto.randomUUID(),
                reportId: id,
                taskId: t.taskId || null,
                description: t.description,
                hoursSpent: t.hoursSpent || 0,
                status: t.status || "completed",
              }))
            )
            .run();
        }
      }
    });
  } catch (err: any) {
    if (
      err?.message?.includes("UNIQUE constraint failed") ||
      err?.code === "SQLITE_CONSTRAINT_UNIQUE"
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
}, "reports:create");
