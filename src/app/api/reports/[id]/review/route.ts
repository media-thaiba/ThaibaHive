import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports, departments, staffDepartments, auditLog } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, inArray } from "drizzle-orm";

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const { status, reviewerComment } = body;

  if (!status || !["reviewed", "rejected"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Must be 'reviewed' or 'rejected'." },
      { status: 400 }
    );
  }

  // Mandatory comment on rejection
  if (status === "rejected" && (!reviewerComment || !reviewerComment.trim())) {
    return NextResponse.json(
      { error: "A comment is required when rejecting a report." },
      { status: 400 }
    );
  }

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

  // HOD department scoping check
  if (session.role === "hod") {
    const userDepts = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.headUserId, session.staffId))
      .all();

    if (userDepts.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deptStaff = await db
      .select({ staffId: staffDepartments.staffId })
      .from(staffDepartments)
      .where(
        inArray(
          staffDepartments.departmentId,
          userDepts.map((d) => d.id)
        )
      )
      .all();

    const staffIds = deptStaff.map((s) => s.staffId).filter(Boolean);

    if (!staffIds.includes(report.staffId)) {
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
