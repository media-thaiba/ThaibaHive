import { NextResponse } from "next/server";
import { db } from "@/db";
import { timetableSlots, timetableEntries, classes, staff, academicYears } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, asc } from "drizzle-orm";

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get("institutionId");
  const classId = url.searchParams.get("classId");
  const teacherId = url.searchParams.get("teacherId");
  const academicYearId = url.searchParams.get("academicYearId");

  // Fetch slots
  const slotConditions = [];
  if (institutionId) {
    slotConditions.push(eq(timetableSlots.institutionId, institutionId));
  }
  const slots = await db
    .select()
    .from(timetableSlots)
    .where(slotConditions.length > 0 ? and(...slotConditions) : undefined)
    .orderBy(asc(timetableSlots.slotOrder))
    .all();

  // Fetch entries
  const entryConditions = [];
  if (institutionId) {
    entryConditions.push(eq(timetableEntries.institutionId, institutionId));
  }
  if (classId) {
    entryConditions.push(eq(timetableEntries.classId, classId));
  }
  if (teacherId) {
    entryConditions.push(eq(timetableEntries.teacherId, teacherId));
  }
  if (academicYearId) {
    entryConditions.push(eq(timetableEntries.academicYearId, academicYearId));
  }

  const entries = await db
    .select({
      id: timetableEntries.id,
      institutionId: timetableEntries.institutionId,
      academicYearId: timetableEntries.academicYearId,
      classId: timetableEntries.classId,
      className: classes.name,
      classSection: classes.section,
      slotId: timetableEntries.slotId,
      slotName: timetableSlots.name,
      slotStartTime: timetableSlots.startTime,
      slotEndTime: timetableSlots.endTime,
      isBreak: timetableSlots.isBreak,
      dayOfWeek: timetableEntries.dayOfWeek,
      subjectName: timetableEntries.subjectName,
      teacherId: timetableEntries.teacherId,
      teacherFirstName: staff.firstName,
      teacherLastName: staff.lastName,
      roomNumber: timetableEntries.roomNumber,
    })
    .from(timetableEntries)
    .leftJoin(timetableSlots, eq(timetableEntries.slotId, timetableSlots.id))
    .leftJoin(classes, eq(timetableEntries.classId, classes.id))
    .leftJoin(staff, eq(timetableEntries.teacherId, staff.id))
    .where(entryConditions.length > 0 ? and(...entryConditions) : undefined)
    .all();

  return NextResponse.json({ slots, entries });
}, "timetables:read");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { action, slot, entry } = body;

  // Handle creating a standard slot definition
  if (action === "create_slot") {
    const { institutionId, name, slotOrder, startTime, endTime, isBreak } = slot || {};
    if (!institutionId || !name || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required slot parameters" }, { status: 400 });
    }

    const newSlot = await db
      .insert(timetableSlots)
      .values({
        id: `slot_${crypto.randomUUID().slice(0, 8)}`,
        institutionId,
        name,
        slotOrder: Number(slotOrder) || 1,
        startTime,
        endTime,
        isBreak: Boolean(isBreak),
      })
      .returning()
      .get();

    return NextResponse.json({ slot: newSlot }, { status: 201 });
  }

  // Handle assigning an entry to the weekly matrix
  const {
    institutionId,
    academicYearId,
    classId,
    slotId,
    dayOfWeek,
    subjectName,
    teacherId,
    roomNumber,
  } = entry || body;

  if (!institutionId || !classId || !slotId || !dayOfWeek || !subjectName) {
    return NextResponse.json({ error: "Missing required timetable entry parameters" }, { status: 400 });
  }

  // Check if slot already exists for this class & day
  const existing = await db
    .select()
    .from(timetableEntries)
    .where(
      and(
        eq(timetableEntries.classId, classId),
        eq(timetableEntries.slotId, slotId),
        eq(timetableEntries.dayOfWeek, Number(dayOfWeek))
      )
    )
    .get();

  if (existing) {
    // Update existing slot entry
    const updated = await db
      .update(timetableEntries)
      .set({
        subjectName,
        teacherId: teacherId || null,
        roomNumber: roomNumber || null,
        academicYearId: academicYearId || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(timetableEntries.id, existing.id))
      .returning()
      .get();

    return NextResponse.json({ entry: updated, updated: true });
  }

  const created = await db
    .insert(timetableEntries)
    .values({
      id: `tt_${crypto.randomUUID().slice(0, 10)}`,
      institutionId,
      academicYearId: academicYearId || null,
      classId,
      slotId,
      dayOfWeek: Number(dayOfWeek),
      subjectName,
      teacherId: teacherId || null,
      roomNumber: roomNumber || null,
    })
    .returning()
    .get();

  return NextResponse.json({ entry: created }, { status: 201 });
}, "timetables:manage");

export const DELETE = requireAuth(async (request: Request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await db.select().from(timetableEntries).where(eq(timetableEntries.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });
  }

  await db.delete(timetableEntries).where(eq(timetableEntries.id, id)).run();

  return NextResponse.json({ success: true, deletedId: id });
}, "timetables:manage");
