import { NextResponse } from "next/server";
import { db } from "@/db";
import { examSchedules, exams } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { examScheduleCreateSchema } from "@/lib/validation/schemas";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");

  if (!examId) {
    return NextResponse.json({ error: "Missing required parameter: examId" }, { status: 400 });
  }

  const schedules = await db
    .select()
    .from(examSchedules)
    .where(eq(examSchedules.examId, examId));

  return NextResponse.json({ schedules });
}, "exam:read");

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parsed = examScheduleCreateSchema.parse(body);

    const examExists = await db.select().from(exams).where(eq(exams.id, parsed.examId)).get();
    if (!examExists) {
      return NextResponse.json({ error: "Target examination session not found" }, { status: 404 });
    }

    // Check room overlap for same date and room if room is specified
    if (parsed.roomNumber) {
      const existingConflict = await db
        .select()
        .from(examSchedules)
        .where(
          and(
            eq(examSchedules.examDate, parsed.examDate),
            eq(examSchedules.roomNumber, parsed.roomNumber),
            eq(examSchedules.startTime, parsed.startTime)
          )
        )
        .get();

      if (existingConflict) {
        return NextResponse.json(
          { error: `Room conflict: Venue ${parsed.roomNumber} is already scheduled at ${parsed.startTime} on ${parsed.examDate}` },
          { status: 400 }
        );
      }
    }

    const scheduleId = `sched_${Date.now()}`;
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
