import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  dailyReports,
  dailyReportTasks,
  staff,
  tasks,
  staffInstitutions,
} from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { eq, desc, inArray, and, or } from "drizzle-orm";
import { getAccessibleStaffIds } from "@/lib/auth/department-scope";
import { dailyReportCreateSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { getStaffInstitutionId } from "@/lib/reports/ledger";

export const GET = requireAuth(async (request, session) => {
  const { role, staffId } = session;
  const { searchParams } = new URL(request.url);
  const scopedInstitutionId = await resolveRequestInstitution(session, searchParams.get("institutionId"));

  let reports: {
    id: string;
    date: string;
    summary: string | null;
    status: string;
    staffId: string;
    firstName: string | null;
    lastName: string | null;
    reviewerComment: string | null;
    reviewedAt: string | null;
    createdAt: string;
  }[] = [];

  if (role === "super_admin") {
    let query = db
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
      .orderBy(desc(dailyReports.date));

    if (scopedInstitutionId && scopedInstitutionId !== "global") {
      const instStaff = await db
        .select({ staffId: staffInstitutions.staffId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.institutionId, scopedInstitutionId))
        .all();
      const staffIds = instStaff.map((s) => s.staffId);
      if (staffIds.length > 0) {
        query = query.where(inArray(dailyReports.staffId, staffIds)) as typeof query;
      } else {
        return NextResponse.json({ reports: [] });
      }
    }

    reports = await query.limit(100).all();
  } else if (role === "admin") {
    // Admin is scoped strictly to their institution
    const callerInstId = (scopedInstitutionId && scopedInstitutionId !== "global")
      ? scopedInstitutionId
      : await getStaffInstitutionId(staffId);

    if (!callerInstId) {
      return NextResponse.json({ reports: [] });
    }

    const instStaff = await db
      .select({ staffId: staffInstitutions.staffId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.institutionId, callerInstId))
      .all();
    const staffIds = instStaff.map((s) => s.staffId);

    if (staffIds.length === 0) {
      return NextResponse.json({ reports: [] });
    }

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
      .where(inArray(dailyReports.staffId, staffIds))
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
    // Regular staff see their own reports
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
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

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
    await db.transaction(async (tx) => {
      await tx.insert(dailyReports)
        .values({
          id: reportId,
          staffId: session.staffId,
          date,
          summary: summary || null,
          status: reportStatus,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      if (reportTasks?.length) {
        await tx.insert(dailyReportTasks)
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

        for (const t of reportTasks) {
          if (t.taskId && t.status === "completed") {
            await tx.update(tasks)
              .set({ status: "completed", completedAt: now, updatedAt: now })
              .where(eq(tasks.id, t.taskId))
              .run();
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

  const report = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.id, reportId))
    .get();

  return NextResponse.json({ report }, { status: 201 });
}, "reports:create");
