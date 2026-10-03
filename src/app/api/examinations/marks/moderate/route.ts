import { NextResponse } from "next/server";
import { db } from "@/db";
import { markEntries, examSchedules, examAuditLogs, exams } from "@thaiba/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const { markEntryId, action, adjustedMarks, reason } = body;

    if (!markEntryId || !action) {
      return NextResponse.json({ error: "Missing required parameters: markEntryId, action" }, { status: 400 });
    }

    const institutionId = await resolveScopedInstitutionId(session.institutionId);

    const row = await db
      .select({
        entry: markEntries,
        schedule: examSchedules,
        exam: exams,
      })
      .from(markEntries)
      .innerJoin(examSchedules, eq(markEntries.examScheduleId, examSchedules.id))
      .innerJoin(exams, eq(examSchedules.examId, exams.id))
      .where(
        institutionId && institutionId !== "global"
          ? and(eq(markEntries.id, markEntryId), eq(exams.institutionId, institutionId))
          : eq(markEntries.id, markEntryId)
      )
      .get();

    if (!row) {
      return NextResponse.json({ error: "Target mark entry not found" }, { status: 404 });
    }

    const existing = row.entry;
    const schedule = row.schedule;

    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      moderatedByStaffId: session.staffId,
      updatedAt: now,
    };

    if (action === "approve") {
      updates.status = "approved";
    } else if (action === "adjust") {
      if (adjustedMarks === undefined || adjustedMarks < 0 || (schedule && adjustedMarks > schedule.maxMarks)) {
        return NextResponse.json({ error: "Invalid adjusted marks value" }, { status: 400 });
      }
      updates.marksObtained = adjustedMarks;
      updates.status = "moderated";
    } else if (action === "return") {
      updates.status = "returned";
      updates.moderationRemarks = reason || "Returned to teacher for correction";
    } else {
      return NextResponse.json({ error: "Invalid moderation action" }, { status: 400 });
    }

    await db.update(markEntries).set(updates).where(eq(markEntries.id, markEntryId));

    if (schedule) {
      await db.insert(examAuditLogs).values({
        id: `audit_${Date.now()}`,
        examId: schedule.examId,
        entityType: "mark_entry",
        entityId: markEntryId,
        action: `mark_moderation_${action}`,
        performedByStaffId: session.staffId,
        previousState: JSON.stringify({ marksObtained: existing.marksObtained, status: existing.status }),
        newState: JSON.stringify(updates),
        reason: reason || "HOD mark moderation",
        timestamp: now,
      });
    }

    return NextResponse.json({ success: true, markEntryId, status: updates.status, updatedAt: now });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to moderate mark entry" }, { status: 400 });
  }
}, "exam:approve_marks");
