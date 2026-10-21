import { NextResponse } from "next/server";
import { db } from "@/db";
import { markEntries, examSchedules, examAuditLogs, exams } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { markModerateSchema } from "@/lib/validation/schemas";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsedResult = markModerateSchema.safeParse(body);
  if (!parsedResult.success) {
    return NextResponse.json({ error: parsedResult.error.issues[0].message }, { status: 400 });
  }
  const { markEntryId, action, adjustedMarks, reason } = parsedResult.data;

  try {
    const institutionId = await resolveScopedInstitutionId(session.institutionId);

    const [row] = await db
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
      );

    if (!row) {
      return NextResponse.json({ error: "Target mark entry not found" }, { status: 404 });
    }

    // Terminal-state lockout: published/archived results are final — no moderation.
    if (row.exam.status === "published" || row.exam.status === "archived") {
      return NextResponse.json(
        { error: "Cannot moderate marks for a published or archived examination" },
        { status: 400 }
      );
    }

    const existing = row.entry;
    const schedule = row.schedule;

    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      moderatedByStaffId: session.staffId,
      updatedAt: now,
    };

    if (action === "approve") {
      if (existing.status === "approved") {
        return NextResponse.json(
          { error: "Mark entry has already been approved" },
          { status: 409 }
        );
      }
      updates.status = "approved";
    } else if (action === "adjust") {
      if (adjustedMarks === undefined || adjustedMarks === null || adjustedMarks < 0 || (schedule && adjustedMarks > schedule.maxMarks)) {
        return NextResponse.json({ error: "Invalid adjusted marks value" }, { status: 400 });
      }
      updates.marksObtained = adjustedMarks;
      updates.status = "moderated";
    } else if (action === "return") {
      updates.status = "returned";
      // Schema has no moderationRemarks column — writing it was silently dropped.
      updates.remarks = reason || "Returned to teacher for correction";
    } else {
      return NextResponse.json({ error: "Invalid moderation action" }, { status: 400 });
    }

    const [updated] = await db
      .update(markEntries)
      .set(updates)
      .where(and(eq(markEntries.id, markEntryId), eq(markEntries.status, existing.status)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Mark entry status was modified by a concurrent request" },
        { status: 409 }
      );
    }

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
