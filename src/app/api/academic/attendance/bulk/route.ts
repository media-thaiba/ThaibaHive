import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentAttendanceLogs, attendanceRegister, classes,  } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const bulkAttendanceSchema = z.object({
  classId: z.string().min(1),
  date: z.string().min(1),
  records: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(["present", "absent", "late", "half_day", "holiday"]),
    reason: z.string().optional(),
  })).min(1),
});

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const parsed = bulkAttendanceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { classId, date, records } = parsed.data;

  const classExists = await db.select().from(classes).where(eq(classes.id, classId)).get();
  if (!classExists) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const inserted: typeof studentAttendanceLogs.$inferSelect[] = [];

  for (const record of records) {
    const existingId = crypto.randomUUID();
    await db
      .insert(studentAttendanceLogs)
      .values({
        id: existingId,
        studentId: record.studentId,
        classId,
        date,
        status: record.status,
        reason: record.reason,
        method: "manual",
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [studentAttendanceLogs.studentId, studentAttendanceLogs.date],
        set: { status: record.status, reason: record.reason },
      })
      .run();

    const row = await db
      .select()
      .from(studentAttendanceLogs)
      .where(eq(studentAttendanceLogs.id, existingId))
      .get();
    if (row) inserted.push(row);
  }

  const counts = await db
    .select({
      status: studentAttendanceLogs.status,
      count: sql<number>`count(*)`,
    })
    .from(studentAttendanceLogs)
    .where(and(
      eq(studentAttendanceLogs.classId, classId),
      eq(studentAttendanceLogs.date, date),
    ))
    .groupBy(studentAttendanceLogs.status)
    .all();

  const totalStudents = records.length;
  const presentCount = counts.find(c => c.status === "present")?.count ?? 0;
  const absentCount = counts.find(c => c.status === "absent")?.count ?? 0;
  const lateCount = counts.find(c => c.status === "late")?.count ?? 0;

  const now2 = new Date().toISOString();
  await db
    .insert(attendanceRegister)
    .values({
      id: crypto.randomUUID(),
      classId,
      date,
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      createdAt: now2,
      updatedAt: now2,
    })
    .onConflictDoUpdate({
      target: [attendanceRegister.classId, attendanceRegister.date],
      set: { totalStudents, presentCount, absentCount, lateCount, updatedAt: now2 },
    })
    .run();

  return NextResponse.json({ success: true, records: inserted, summary: { totalStudents, presentCount, absentCount, lateCount } });
}, "student_attendance:manage");
