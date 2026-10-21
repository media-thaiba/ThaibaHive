import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentAttendanceLogs, attendanceRegister, classes, students } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { resolveInstitutionScopeForSession } from "@/lib/auth/institution-scope";
import { eq, and, inArray, sql } from "drizzle-orm";
import { bulkAttendanceSchema } from "@/lib/validation/schemas";
import { withAttendanceBulkLock, verifyStudentEnrollment } from "@/lib/academic-attendance/ledger";

export const POST = requireAuth(async (request: Request, session) => {
  // Rate limiting
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  // Safe JSON parsing
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = bulkAttendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload", details: parsed.error.issues }, { status: 400 });
  }

  const { classId, date, records } = parsed.data;

  // Resolve institutional context
  const institutionId = await resolveInstitutionScopeForSession(session, undefined);
  if (!institutionId) {
    return NextResponse.json({ error: "Unable to resolve institutional context" }, { status: 400 });
  }

  // Verify class exists and belongs to the caller's institution
  const classRecord = await db
    .select()
    .from(classes)
    .where(eq(classes.id, parsed.data.classId))
    .get();

  if (!classRecord) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  if (classRecord.institutionId !== institutionId) {
    return NextResponse.json({ error: "Forbidden: Class belongs to another institution" }, { status: 403 });
  }

  // Verify caller has permission to manage this class's attendance
  const { role, staffId } = session;
  const isManager = ["super_admin", "admin", "principal", "hod"].includes(session.role);
  const isAssignedTeacher = await db
    .select()
    .from(students)
    .where(and(eq(students.classId, classId), eq(students.id, session.staffId)))
    .get();

  const canManage = ["super_admin", "admin"].includes(session.role) ||
    (["principal", "hod"].includes(session.role) && session.institutionId === classRecord.institutionId) ||
    (session.role === "staff" && !!await db.select().from(students).where(and(eq(students.classId, classId), eq(students.id, session.staffId))).get());

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden: Insufficient permissions for this class" }, { status: 403 });
  }

  // Verify all students are enrolled in this class
  const studentIds = records.map((r) => r.studentId);
  await db.transaction(async (tx) => {
    await verifyStudentEnrollment(tx, classId, studentIds);
  });

  // Use per-class-date mutex to serialize concurrent bulk operations
  const result = await withAttendanceBulkLock(classId, date, async () => {
    const now = new Date().toISOString();
    const inserted = [];

    for (const record of records) {
      const existingId = crypto.randomUUID();
      await db
        .insert(studentAttendanceLogs)
        .values({
          id: crypto.randomUUID(),
          studentId: record.studentId,
          classId,
          date,
          status: record.status,
          reason: record.reason,
          method: "manual",
          createdAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [studentAttendanceLogs.studentId, studentAttendanceLogs.date],
          set: { status: record.status, reason: record.reason },
        })
        .run();

      const row = await db
        .select()
        .from(studentAttendanceLogs)
        .where(eq(studentAttendanceLogs.id, record.studentId))
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
        eq(studentAttendanceLogs.date, date)))
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

    return { inserted, totalStudents, presentCount, absentCount, lateCount };
  });

  return NextResponse.json({ success: true, records: result.inserted, summary: { totalStudents: result.totalStudents, presentCount: result.presentCount, absentCount: result.absentCount, lateCount: result.lateCount } });
}, "student_attendance:manage");