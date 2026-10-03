import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports, auditLog } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";
import { canAccessStaff } from "@/lib/auth/department-scope";
import { dailyReportReviewSchema } from "@/lib/validation/schemas";

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const result = dailyReportReviewSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid data", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { status, reviewerComment } = result.data;

  const report = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.id, id))
    .get();

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Can only review reports in "submitted" status
  if (report.status !== "submitted") {
    return NextResponse.json(
      { error: "Only submitted reports can be reviewed" },
      { status: 400 }
    );
  }

  // Auth scoping check for non-admins (principal, HOD)
  if (session.role !== "super_admin" && session.role !== "admin") {
    const hasAccess = await canAccessStaff(session.staffId, session.role, report.staffId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const now = new Date().toISOString();

  const updated = await db
    .update(dailyReports)
    .set({
      status,
      reviewerComment: reviewerComment || null,
      reviewedById: session.staffId,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(dailyReports.id, id))
    .returning()
    .get();

  // Audit log
  db.insert(auditLog)
    .values({
      id: crypto.randomUUID(),
      staffId: session.staffId,
      action: status === "reviewed" ? "report_reviewed" : "report_rejected",
      entityType: "daily_report",
      entityId: id,
      details: {
        status,
        reviewerComment: reviewerComment || null,
      },
      createdAt: now,
    })
    .run();

  return NextResponse.json({ report: updated });
}, "reports:review");
