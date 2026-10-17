import { NextResponse } from "next/server";
import { db } from "@/db";
import { examSchedules, exams } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
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

    // Terminal-state guard: schedules are frozen once results are published or archived.
    if (examExists.status === "published" || examExists.status === "archived") {
      return NextResponse.json(
        { error: "Cannot add schedules to a published or archived examination" },
        { status: 400 }
      );
    }

    // Time-order integrity: end time must be strictly after start time.
    const toMinutes = (t: string): number => {
      const [h, m] = t.split(":").map((v) => Number(v));
      if (Number.isNaN(h) || Number.isNaN(m)) return Number.NaN;
      return h * 60 + m;
    };
    const startMin = toMinutes(parsed.startTime);
    const endMin = toMinutes(parsed.endTime);
    if (Number.isNaN(startMin) || Number.isNaN(endMin)) {
      return NextResponse.json(
        { error: "startTime and endTime must be HH:MM formatted times" },
        { status: 400 }
      );
    }
    if (endMin <= startMin) {
      return NextResponse.json(
        { error: "endTime must be after startTime" },
        { status: 400 }
      );
    }

    // Date-window integrity: the schedule date must fall inside the exam session window.
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDate.test(parsed.examDate) || !isoDate.test(examExists.startDate) || !isoDate.test(examExists.endDate)) {
      return NextResponse.json(
        { error: "examDate, startDate and endDate must be ISO dates (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    if (parsed.examDate < examExists.startDate || parsed.examDate > examExists.endDate) {
      return NextResponse.json(
        {
          error: `Schedule date ${parsed.examDate} is outside the examination window (${examExists.startDate} to ${examExists.endDate})`,
        },
        { status: 400 }
      );
    }

    // Check interval room overlap for same date and room if room is specified.
    // Scoped to the caller's institution so coincidental room names ("Room 1")
    // at other tenants never produce phantom conflicts.
    if (parsed.roomNumber) {
      const existingSchedules = institutionId && institutionId !== "global"
        ? await db
            .select({ schedule: examSchedules })
            .from(examSchedules)
            .innerJoin(exams, eq(examSchedules.examId, exams.id))
            .where(
              and(
                eq(examSchedules.examDate, parsed.examDate),
                eq(examSchedules.roomNumber, parsed.roomNumber),
                eq(exams.institutionId, institutionId)
              )
            )
            .all()
            .then((rows) => rows.map((r) => r.schedule))
        : await db
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

