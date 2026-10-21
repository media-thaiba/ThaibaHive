import { NextResponse } from "next/server";
import { db } from "@/db";
import { teacherSubstitutions, timetableEntries, timetableSlots, classes, staff } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { teacherSubstitutionCreateSchema, teacherSubstitutionUpdateSchema } from "@/lib/validation/schemas";
import { eq, and, desc } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const rawInst = url.searchParams.get("institutionId");
  const institutionId = await resolveRequestInstitution(session, rawInst);
  const date = url.searchParams.get("date");
  const teacherId = url.searchParams.get("teacherId");

  const conditions = [];
  if (institutionId && institutionId !== "global") {
    conditions.push(eq(teacherSubstitutions.institutionId, institutionId));
  }
  if (date) {
    conditions.push(eq(teacherSubstitutions.date, date));
  }
  if (teacherId) {
    conditions.push(eq(teacherSubstitutions.substituteTeacherId, teacherId));
  }

  const rows = await db
    .select({
      id: teacherSubstitutions.id,
      institutionId: teacherSubstitutions.institutionId,
      timetableEntryId: teacherSubstitutions.timetableEntryId,
      date: teacherSubstitutions.date,
      reason: teacherSubstitutions.reason,
      status: teacherSubstitutions.status,
      originalTeacherId: teacherSubstitutions.originalTeacherId,
      originalTeacherName: staff.firstName,
      substituteTeacherId: teacherSubstitutions.substituteTeacherId,
      subjectName: timetableEntries.subjectName,
      className: classes.name,
      classSection: classes.section,
      slotName: timetableSlots.name,
      slotStartTime: timetableSlots.startTime,
      slotEndTime: timetableSlots.endTime,
      createdAt: teacherSubstitutions.createdAt,
    })
    .from(teacherSubstitutions)
    .leftJoin(timetableEntries, eq(teacherSubstitutions.timetableEntryId, timetableEntries.id))
    .leftJoin(timetableSlots, eq(timetableEntries.slotId, timetableSlots.id))
    .leftJoin(classes, eq(timetableEntries.classId, classes.id))
    .leftJoin(staff, eq(teacherSubstitutions.originalTeacherId, staff.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(teacherSubstitutions.date))
    .all();

  return NextResponse.json({ substitutions: rows });
}, "timetables:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parseResult = teacherSubstitutionCreateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message || "Validation failed" },
      { status: 400 }
    );
  }

  const validData = parseResult.data;

  const institutionId = await resolveRequestInstitution(session, validData.institutionId);
  if (institutionId === "global") {
    return NextResponse.json(
      { error: "Explicit institutionId required" },
      { status: 400 }
    );
  }

  // Verify timetableEntryId exists
  const entry = await db
    .select({ id: timetableEntries.id })
    .from(timetableEntries)
    .where(eq(timetableEntries.id, validData.timetableEntryId))
    .get();

  if (!entry) {
    return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });
  }

  // Duplicate substitution guard
  const existingSub = await db
    .select({ id: teacherSubstitutions.id })
    .from(teacherSubstitutions)
    .where(
      and(
        eq(teacherSubstitutions.timetableEntryId, validData.timetableEntryId),
        eq(teacherSubstitutions.date, validData.date)
      )
    )
    .get();

  if (existingSub) {
    return NextResponse.json(
      { error: "A substitution record already exists for this timetable entry and date" },
      { status: 409 }
    );
  }

  const created = await db
    .insert(teacherSubstitutions)
    .values({
      id: `sub_${crypto.randomUUID().slice(0, 10)}`,
      institutionId,
      timetableEntryId: validData.timetableEntryId,
      date: validData.date,
      originalTeacherId: validData.originalTeacherId,
      substituteTeacherId: validData.substituteTeacherId,
      reason: validData.reason || null,
      assignedById: validData.assignedById || null,
      status: "assigned",
    })
    .returning()
    .get();

  return NextResponse.json({ substitution: created }, { status: 201 });
}, "timetables:manage");

export const PATCH = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parseResult = teacherSubstitutionUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message || "Validation failed" },
      { status: 400 }
    );
  }

  const { id, status } = parseResult.data;

  const existing = await db.select().from(teacherSubstitutions).where(eq(teacherSubstitutions.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Substitution record not found" }, { status: 404 });
  }

  const updated = await db
    .update(teacherSubstitutions)
    .set({
      status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(teacherSubstitutions.id, id))
    .returning()
    .get();

  return NextResponse.json({ substitution: updated });
}, "timetables:manage");
