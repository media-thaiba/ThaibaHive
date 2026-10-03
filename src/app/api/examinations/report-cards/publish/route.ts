import { NextResponse } from "next/server";
import { db } from "@/db";
import { exams, tabulationRegisters, examAuditLogs } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const { examId } = body;

    if (!examId) {
      return NextResponse.json({ error: "Missing required parameter: examId" }, { status: 400 });
    }

    const exam = await db.select().from(exams).where(eq(exams.id, examId)).get();
    if (!exam) {
      return NextResponse.json({ error: "Target examination session not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 1. Update exam status to 'published'
    await db.update(exams).set({ status: "published", updatedAt: now }).where(eq(exams.id, examId));

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
