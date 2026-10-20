import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports, auditLog } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";
import { canAccessStaff } from "@/lib/auth/department-scope";
import { dailyReportReviewSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { withReportLock, canReviewDailyReport } from "@/lib/reports/ledger";

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const result = dailyReportReviewSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid data", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { status, reviewerComment } = result.data;

  return await withReportLock(id, async () => {
    const report = await db
      .select()
      .from(dailyReports)
      .where(eq(dailyReports.id, id))
      .get();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Segregation of duties: Reviewer CANNOT review their own report
    const reviewCheck = canReviewDailyReport(session, report.staffId);
    if (!reviewCheck.allowed) {
      return NextResponse.json({ error: reviewCheck.reason || "Forbidden" }, { status: 403 });
    }

    // Can only review reports in "submitted" status
    if (report.status !== "submitted") {
      return NextResponse.json(
        { error: "Only submitted reports can be reviewed" },
        { status: 400 }
      );
    }

    // Auth scoping check for non-admins (principal, HOD)
    if (session.role !== "super_admin") {
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
    await db.insert(auditLog)
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
  });
}, "reports:review");
