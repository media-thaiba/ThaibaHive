import { NextResponse } from "next/server";
import { db } from "@/db";
import { markEntries, examSchedules, examAuditLogs, exams, students } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { markEntryBatchSchema } from "@/lib/validation/schemas";
import { eq, and, inArray } from "drizzle-orm";
import crypto from "crypto";

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsedResult = markEntryBatchSchema.safeParse(body);
  if (!parsedResult.success) {
    return NextResponse.json({ error: parsedResult.error.issues[0].message }, { status: 400 });
  }
  const parsed = parsedResult.data;

  try {
    const schedule = await db
      .select()
      .from(examSchedules)
      .where(eq(examSchedules.id, parsed.examScheduleId))
      .get();

    if (!schedule) {
      return NextResponse.json({ error: "Target examination schedule not found" }, { status: 404 });
    }

    // Tenant boundary: the schedule's parent exam must belong to the caller's institution.
    const institutionId = await resolveScopedInstitutionId(session.institutionId);
    const exam = await db.select().from(exams).where(eq(exams.id, schedule.examId)).get();
    if (!exam || (institutionId && institutionId !== "global" && exam.institutionId !== institutionId)) {
      // Same message as a missing schedule — do not leak existence across tenants.
      return NextResponse.json({ error: "Target examination schedule not found" }, { status: 404 });
    }

    // Terminal-state lockout: results are final once published or archived.
    if (exam.status === "published" || exam.status === "archived") {
      return NextResponse.json(
        { error: "Cannot enter marks for a published or archived examination" },
        { status: 400 }
      );
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

    // Tenant boundary: every submitted student must belong to the caller's institution.
    if (institutionId && institutionId !== "global") {
      const validStudents = await db
        .select({ id: students.id })
        .from(students)
        .where(and(inArray(students.id, [...uniqueStudentIds]), eq(students.institutionId, institutionId)))
        .all();
      const validSet = new Set(validStudents.map((s) => s.id));
      const missing = [...uniqueStudentIds].filter((id) => !validSet.has(id));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Students not found in institution scope: ${missing.join(", ")}` },
          { status: 404 }
        );
      }
    }

    // Pre-validate all mark boundaries before beginning database transaction
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
    }

    const now = new Date().toISOString();
    let processedCount = 0;

    await db.transaction(async (tx) => {
      for (const entry of parsed.entries) {
        const existing = await tx
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
          if (existing.status === "approved") {
            throw new Error(`Cannot modify approved mark entry for student ${entry.studentId}`);
          }

          await tx
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
          await tx.insert(markEntries).values({
            id: `mark_${crypto.randomUUID()}`,
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

      // Audit log inside transaction
      await tx.insert(examAuditLogs).values({
        id: `audit_${crypto.randomUUID()}`,
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
    });

    return NextResponse.json({ success: true, processedCount, updatedAt: now });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process batch mark entry" }, { status: 400 });
  }
}, "exam:enter_marks");
