import { NextResponse } from "next/server";
import { db } from "@/db";
import { markEntries, examSchedules, examAuditLogs } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { markEntryBatchSchema } from "@/lib/validation/schemas";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const parsed = markEntryBatchSchema.parse(body);

    const schedule = await db
      .select()
      .from(examSchedules)
      .where(eq(examSchedules.id, parsed.examScheduleId))
      .get();

    if (!schedule) {
      return NextResponse.json({ error: "Target examination schedule not found" }, { status: 404 });
    }

    // Check duplicate student IDs in submission payload
    const studentIds = parsed.entries.map((e) => e.studentId);
    const uniqueStudentIds = new Set(studentIds);
    if (uniqueStudentIds.size !== studentIds.length) {
      return NextResponse.json(
        { error: "Duplicate student IDs detected in batch mark submission" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let processedCount = 0;

    for (const entry of parsed.entries) {
      if (!entry.isAbsent && entry.marksObtained !== null && entry.marksObtained !== undefined) {
        if (entry.marksObtained < 0 || entry.marksObtained > schedule.maxMarks) {
          return NextResponse.json(
            {
              error: `Invalid mark ${entry.marksObtained} for student ${entry.studentId}. Must be between 0 and max marks (${schedule.maxMarks}).`,
            },
            { status: 400 }
          );
        }
      }

      const existing = await db
        .select()
        .from(markEntries)
        .where(
          and(
            eq(markEntries.examScheduleId, parsed.examScheduleId),
            eq(markEntries.studentId, entry.studentId)
          )
        )
        .get();

      const evaluatorToken = parsed.doubleBlind
        ? `EVAL-${crypto.createHash("md5").update(`${entry.studentId}:${parsed.examScheduleId}`).digest("hex").substring(0, 8).toUpperCase()}`
        : null;

      if (existing) {
        // Optimistic concurrency locking check: verify record is still in editable status
        if (existing.status === "approved") {
          return NextResponse.json(
            { error: `Cannot modify approved mark entry for student ${entry.studentId}` },
            { status: 400 }
          );
        }

        await db
          .update(markEntries)
          .set({
            marksObtained: entry.isAbsent ? null : entry.marksObtained,
            isAbsent: entry.isAbsent ?? false,
            doubleBlind: parsed.doubleBlind ?? false,
            evaluatorToken: evaluatorToken || existing.evaluatorToken,
            remarks: entry.remarks || existing.remarks,
            enteredByStaffId: session.staffId,
            updatedAt: now,
          })
          .where(eq(markEntries.id, existing.id));
      } else {
        await db.insert(markEntries).values({
          id: `mark_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          examScheduleId: parsed.examScheduleId,
          studentId: entry.studentId,
          marksObtained: entry.isAbsent ? null : entry.marksObtained,
          maxMarks: schedule.maxMarks,
          isAbsent: entry.isAbsent ?? false,
          evaluatorToken,
          doubleBlind: parsed.doubleBlind ?? false,
          remarks: entry.remarks || null,
          status: "submitted",
          enteredByStaffId: session.staffId,
          createdAt: now,
          updatedAt: now,
        });
      }

      processedCount++;
    }

    // Audit log
    await db.insert(examAuditLogs).values({
      id: `audit_${Date.now()}`,
      examId: schedule.examId,
      entityType: "mark_entry",
      entityId: parsed.examScheduleId,
      action: "batch_mark_entry",
      performedByStaffId: session.staffId,
      previousState: null,
      newState: JSON.stringify({ processedCount, doubleBlind: parsed.doubleBlind }),
      reason: "Batch teacher mark entry submission",
      timestamp: now,
    });

    return NextResponse.json({ success: true, processedCount, updatedAt: now });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process batch mark entry" }, { status: 400 });
  }
}, "exam:enter_marks");
