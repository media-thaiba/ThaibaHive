import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  dailyReports,
  dailyReportTasks,
  staff,
  tasks,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc, inArray, and, or } from "drizzle-orm";
import { getAccessibleStaffIds } from "@/lib/auth/department-scope";
import { dailyReportCreateSchema } from "@/lib/validation/schemas";

export const GET = requireAuth(async (request, session) => {
  const { role, staffId } = session;
  let reports: { id: string; date: string; summary: string | null; status: string; staffId: string; firstName: string | null; lastName: string | null; reviewerComment: string | null; reviewedAt: string | null; createdAt: string }[] = [];

  if (role === "super_admin" || role === "admin") {
    reports = await db
      .select({
        id: dailyReports.id,
        date: dailyReports.date,
        summary: dailyReports.summary,
        status: dailyReports.status,
        staffId: dailyReports.staffId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        reviewerComment: dailyReports.reviewerComment,
        reviewedAt: dailyReports.reviewedAt,
        createdAt: dailyReports.createdAt,
      })
      .from(dailyReports)
      .leftJoin(staff, eq(dailyReports.staffId, staff.id))
      .orderBy(desc(dailyReports.date))
      .limit(100)
      .all();
  } else if (role === "principal") {
    const accessibleStaffIds = await getAccessibleStaffIds(staffId, role);
    if (accessibleStaffIds && accessibleStaffIds.length > 0) {
      reports = await db
        .select({
          id: dailyReports.id,
          date: dailyReports.date,
          summary: dailyReports.summary,
          status: dailyReports.status,
          staffId: dailyReports.staffId,
          firstName: staff.firstName,
          lastName: staff.lastName,
          reviewerComment: dailyReports.reviewerComment,
          reviewedAt: dailyReports.reviewedAt,
          createdAt: dailyReports.createdAt,
        })
        .from(dailyReports)
        .leftJoin(staff, eq(dailyReports.staffId, staff.id))
        .where(
          and(
            inArray(dailyReports.staffId, accessibleStaffIds),
            or(
              inArray(dailyReports.status, ["submitted", "reviewed", "rejected"]),
              eq(dailyReports.staffId, staffId)
            )
          )
        )
        .orderBy(desc(dailyReports.date))
        .limit(100)
        .all();
    }
  } else if (role === "hod") {
    const accessibleStaffIds = await getAccessibleStaffIds(staffId, role);
    if (accessibleStaffIds && accessibleStaffIds.length > 0) {
      reports = await db
        .select({
          id: dailyReports.id,
          date: dailyReports.date,
          summary: dailyReports.summary,
          status: dailyReports.status,
          staffId: dailyReports.staffId,
          firstName: staff.firstName,
          lastName: staff.lastName,
          reviewerComment: dailyReports.reviewerComment,
          reviewedAt: dailyReports.reviewedAt,
          createdAt: dailyReports.createdAt,
        })
        .from(dailyReports)
        .leftJoin(staff, eq(dailyReports.staffId, staff.id))
        .where(
          and(
            inArray(dailyReports.staffId, accessibleStaffIds),
            or(
              inArray(dailyReports.status, ["submitted", "reviewed", "rejected"]),
              eq(dailyReports.staffId, staffId)
            )
          )
        )
        .orderBy(desc(dailyReports.date))
        .all();
    }
  } else {
    reports = await db
      .select({
        id: dailyReports.id,
        date: dailyReports.date,
        summary: dailyReports.summary,
        status: dailyReports.status,
        staffId: dailyReports.staffId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        reviewerComment: dailyReports.reviewerComment,
        reviewedAt: dailyReports.reviewedAt,
        createdAt: dailyReports.createdAt,
      })
      .from(dailyReports)
      .leftJoin(staff, eq(dailyReports.staffId, staff.id))
      .where(eq(dailyReports.staffId, staffId))
      .orderBy(desc(dailyReports.date))
      .limit(30)
      .all();
  }

  return NextResponse.json({ reports });
}, "reports:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const result = dailyReportCreateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid data", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { date, summary, status, tasks: reportTasks } = result.data;

  const reportStatus = status === "draft" ? "draft" : "submitted";

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
      .map((t) => t.taskId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
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

  const reportId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await db.transaction(async () => {
      await db.insert(dailyReports)
        .values({
          id: reportId,
          staffId: session.staffId,
          date,
          summary,
          status: reportStatus,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      if (reportTasks?.length) {
        await db.insert(dailyReportTasks)
          .values(
            reportTasks.map((t) => ({
              id: crypto.randomUUID(),
              reportId,
              taskId: t.taskId || null,
              description: t.description,
              hoursSpent: t.hoursSpent || 0,
              status: t.status || "completed",
            }))
          )
          .run();
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

  const report = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.id, reportId))
    .get();

  return NextResponse.json({ report }, { status: 201 });
}, "reports:create");
