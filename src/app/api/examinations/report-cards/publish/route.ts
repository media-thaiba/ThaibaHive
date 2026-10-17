import { NextResponse } from "next/server";
import { db } from "@/db";
import { exams, tabulationRegisters, examAuditLogs } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const { examId } = body;

    if (!examId) {
      return NextResponse.json({ error: "Missing required parameter: examId" }, { status: 400 });
    }

    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
    const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
      ? and(eq(exams.id, examId), eq(exams.institutionId, scopedInstitutionId))
      : eq(exams.id, examId);

    const exam = await db.select().from(exams).where(whereClause).get();
    if (!exam) {
      return NextResponse.json({ error: "Target examination session not found" }, { status: 404 });
    }

    // Terminal-state guard: results are final once published or archived — re-publishing
    // must not duplicate audit logs or re-stamp the publication timestamp.
    if (exam.status === "published") {
      return NextResponse.json(
        { error: "Examination results are already published" },
        { status: 409 }
      );
    }
    if (exam.status === "archived") {
      return NextResponse.json(
        { error: "Cannot publish results for an archived examination" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 1. Update exam status to 'published'
    await db.update(exams).set({ status: "published", updatedAt: now }).where(whereClause);

    // 2. Stamp publication timestamp on tabulation registers
    await db
      .update(tabulationRegisters)
      .set({ publishedAt: now })
      .where(eq(tabulationRegisters.examId, examId));

    // 3. Audit log
    await db.insert(examAuditLogs).values({
      id: `audit_${Date.now()}`,
      examId,
      entityType: "result",
      entityId: examId,
      action: "publish_results",
      performedByStaffId: session.staffId,
      previousState: JSON.stringify({ status: exam.status }),
      newState: JSON.stringify({ status: "published", publishedAt: now }),
      reason: "Official publication of exam results to student and parent portal",
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      examId,
      status: "published",
      publishedAt: now,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to publish report cards" }, { status: 400 });
  }
}, "exam:publish_results");
