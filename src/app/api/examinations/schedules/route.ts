import { NextResponse } from "next/server";
import { db } from "@/db";
import { examSchedules, exams } from "@thaiba/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { examScheduleCreateSchema } from "@/lib/validation/schemas";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  if (!examId) {
    return NextResponse.json({ error: "Missing required parameter: examId" }, { status: 400 });
  }

  // Ensure target exam belongs to scoped institution
  const examExists = institutionId && institutionId !== "global"
    ? await db.select().from(exams).where(and(eq(exams.id, examId), eq(exams.institutionId, institutionId))).get()
    : await db.select().from(exams).where(eq(exams.id, examId)).get();

  if (!examExists) {
    return NextResponse.json({ error: "Examination not found" }, { status: 404 });
  }

  const schedules = await db
    .select()
    .from(examSchedules)
    .where(eq(examSchedules.examId, examId))
    .all();

  return NextResponse.json({ schedules });
}, "exam:read");

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const parsed = examScheduleCreateSchema.parse(body);
    const institutionId = await resolveScopedInstitutionId(session.institutionId);

    const examExists = institutionId && institutionId !== "global"
      ? await db.select().from(exams).where(and(eq(exams.id, parsed.examId), eq(exams.institutionId, institutionId))).get()
      : await db.select().from(exams).where(eq(exams.id, parsed.examId)).get();

    if (!examExists) {
      return NextResponse.json({ error: "Target examination session not found" }, { status: 404 });
    }

    // Check interval room overlap for same date and room if room is specified
    if (parsed.roomNumber) {
      const existingSchedules = await db
        .select()
        .from(examSchedules)
        .where(
          and(
            eq(examSchedules.examDate, parsed.examDate),
            eq(examSchedules.roomNumber, parsed.roomNumber)
          )
        )
        .all();

      const conflict = existingSchedules.find(
        (s) => parsed.startTime < s.endTime && parsed.endTime > s.startTime
      );

      if (conflict) {
        return NextResponse.json(
          {
            error: `Room conflict: Venue ${parsed.roomNumber} is already scheduled between ${conflict.startTime} and ${conflict.endTime} on ${parsed.examDate}`,
          },
          { status: 400 }
        );
      }
    }

    const scheduleId = `sched-${randomUUID()}`;
    const newSchedule = {
      id: scheduleId,
      examId: parsed.examId,
      courseId: parsed.courseId || null,
      subjectName: parsed.subjectName,
      examDate: parsed.examDate,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      durationMinutes: parsed.durationMinutes,
      maxMarks: parsed.maxMarks,
      passMarks: parsed.passMarks,
      roomNumber: parsed.roomNumber || null,
      createdAt: new Date().toISOString(),
    };

    await db.insert(examSchedules).values(newSchedule);

    return NextResponse.json({ success: true, schedule: newSchedule }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create examination schedule" }, { status: 400 });
  }
}, "exam:create");

