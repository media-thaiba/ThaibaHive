import { NextResponse } from "next/server";
import { db } from "@/db";
import { teacherSubstitutions, timetableEntries, timetableSlots, classes, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, desc } from "drizzle-orm";

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get("institutionId");
  const date = url.searchParams.get("date");
  const teacherId = url.searchParams.get("teacherId");

  const conditions = [];
  if (institutionId) {
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

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const {
    institutionId,
    timetableEntryId,
    date,
    originalTeacherId,
    substituteTeacherId,
    reason,
    assignedById,
  } = body;

  if (!institutionId || !timetableEntryId || !date || !originalTeacherId || !substituteTeacherId) {
    return NextResponse.json(
      { error: "institutionId, timetableEntryId, date, originalTeacherId, and substituteTeacherId are required" },
      { status: 400 }
    );
  }

  const created = await db
    .insert(teacherSubstitutions)
    .values({
      id: `sub_${crypto.randomUUID().slice(0, 10)}`,
      institutionId,
      timetableEntryId,
      date,
      originalTeacherId,
      substituteTeacherId,
      reason: reason || null,
      assignedById: assignedById || null,
      status: "assigned",
    })
    .returning()
    .get();

  return NextResponse.json({ substitution: created }, { status: 201 });
}, "timetables:manage");

export const PATCH = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  }

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
