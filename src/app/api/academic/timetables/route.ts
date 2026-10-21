import { NextResponse } from "next/server";
import { db } from "@/db";
import { timetableSlots, timetableEntries, classes, staff } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { timetableSlotCreateSchema, timetableEntryCreateSchema } from "@/lib/validation/schemas";
import { eq, and, asc, ne, sql } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const requestedInst = url.searchParams.get("institutionId");
  const institutionId = await resolveRequestInstitution(session, requestedInst);
  const classId = url.searchParams.get("classId");
  const teacherId = url.searchParams.get("teacherId");
  const academicYearId = url.searchParams.get("academicYearId");

  // Fetch slots
  const slotConditions = [];
  if (institutionId && institutionId !== "global") {
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
  if (institutionId && institutionId !== "global") {
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

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { action, slot, entry } = body;

  // Handle creating a standard slot definition
  if (action === "create_slot") {
    let resolvedSlotInst = slot?.institutionId;
    if (!resolvedSlotInst) {
      resolvedSlotInst = (session as any)?.institutionId || (session as any)?.institutionIds?.[0];
    }

    const rawSlotData = {
      institutionId: resolvedSlotInst,
      name: slot?.name,
      slotOrder: slot?.slotOrder !== undefined ? Number(slot.slotOrder) : 1,
      startTime: slot?.startTime,
      endTime: slot?.endTime,
      isBreak: Boolean(slot?.isBreak),
    };

    const parseSlot = timetableSlotCreateSchema.safeParse(rawSlotData);
    if (!parseSlot.success) {
      return NextResponse.json(
        { error: parseSlot.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }
    const validSlot = parseSlot.data;
    const slotInstitutionId = validSlot.institutionId;
    if (!slotInstitutionId) {
      return NextResponse.json({ error: "Explicit institutionId required" }, { status: 400 });
    }

    // Slot collision check: duplicate slotOrder within same institution
    const existingSlot = await db
      .select({ id: timetableSlots.id })
      .from(timetableSlots)
      .where(
        and(
          eq(timetableSlots.institutionId, slotInstitutionId),
          eq(timetableSlots.slotOrder, validSlot.slotOrder)
        )
      )
      .get();

    if (existingSlot) {
      return NextResponse.json(
        { error: "A timetable slot with this slot order already exists" },
        { status: 409 }
      );
    }

    const newSlot = await db
      .insert(timetableSlots)
      .values({
        id: `slot_${crypto.randomUUID().slice(0, 8)}`,
        institutionId: slotInstitutionId,
        name: validSlot.name,
        slotOrder: validSlot.slotOrder,
        startTime: validSlot.startTime,
        endTime: validSlot.endTime,
        isBreak: validSlot.isBreak,
      })
      .returning()
      .get();

    return NextResponse.json({ slot: newSlot }, { status: 201 });
  }

  // Handle assigning an entry to the weekly matrix
  const rawEntry = entry || body;
  let institutionId = rawEntry?.institutionId;

  if (!institutionId && rawEntry?.classId) {
    const cls = await db.select({ institutionId: classes.institutionId }).from(classes).where(eq(classes.id, rawEntry.classId)).get();
    institutionId = cls?.institutionId;
  }
  if (!institutionId) {
    institutionId = (session as any)?.institutionId || (session as any)?.institutionIds?.[0];
  }

  const entryToValidate = {
    ...rawEntry,
    institutionId,
    dayOfWeek: rawEntry?.dayOfWeek !== undefined ? Number(rawEntry.dayOfWeek) : undefined,
  };

  const parseEntry = timetableEntryCreateSchema.safeParse(entryToValidate);
  if (!parseEntry.success) {
    return NextResponse.json(
      { error: parseEntry.error.issues[0]?.message || "Validation failed" },
      { status: 400 }
    );
  }
  const validEntry = parseEntry.data;
  const entryInstitutionId = validEntry.institutionId;
  if (!entryInstitutionId) {
    return NextResponse.json({ error: "Explicit institutionId required" }, { status: 400 });
  }

  // Collision Check 1: Instructor overlap collision across other classes
  if (validEntry.teacherId) {
    const teacherCollisionConditions = [
      eq(timetableEntries.institutionId, entryInstitutionId),
      eq(timetableEntries.teacherId, validEntry.teacherId),
      eq(timetableEntries.dayOfWeek, validEntry.dayOfWeek),
      eq(timetableEntries.slotId, validEntry.slotId),
      ne(timetableEntries.classId, validEntry.classId),
    ];

    const teacherCollision = await db
      .select({ id: timetableEntries.id })
      .from(timetableEntries)
      .where(and(...teacherCollisionConditions))
      .get();

    if (teacherCollision) {
      return NextResponse.json(
        { error: "Instructor is already scheduled for another class in this time slot" },
        { status: 409 }
      );
    }
  }

  // Collision Check 2: Room occupancy collision across other classes
  if (validEntry.roomNumber && validEntry.roomNumber.trim().length > 0) {
    const roomCollisionConditions = [
      eq(timetableEntries.institutionId, entryInstitutionId),
      sql`lower(${timetableEntries.roomNumber}) = lower(${validEntry.roomNumber.trim()})`,
      eq(timetableEntries.dayOfWeek, validEntry.dayOfWeek),
      eq(timetableEntries.slotId, validEntry.slotId),
      ne(timetableEntries.classId, validEntry.classId),
    ];

    const roomCollision = await db
      .select({ id: timetableEntries.id })
      .from(timetableEntries)
      .where(and(...roomCollisionConditions))
      .get();

    if (roomCollision) {
      return NextResponse.json(
        { error: "Room is already scheduled for another class in this time slot" },
        { status: 409 }
      );
    }
  }

  // Check if slot already exists for this class & day
  const existing = await db
    .select()
    .from(timetableEntries)
    .where(
      and(
        eq(timetableEntries.classId, validEntry.classId),
        eq(timetableEntries.slotId, validEntry.slotId),
        eq(timetableEntries.dayOfWeek, validEntry.dayOfWeek)
      )
    )
    .get();

  if (existing) {
    // Update existing slot entry
    const updated = await db
      .update(timetableEntries)
      .set({
        subjectName: validEntry.subjectName,
        teacherId: validEntry.teacherId || null,
        roomNumber: validEntry.roomNumber || null,
        academicYearId: validEntry.academicYearId || null,
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
      institutionId: entryInstitutionId,
      academicYearId: validEntry.academicYearId || null,
      classId: validEntry.classId,
      slotId: validEntry.slotId,
      dayOfWeek: validEntry.dayOfWeek,
      subjectName: validEntry.subjectName,
      teacherId: validEntry.teacherId || null,
      roomNumber: validEntry.roomNumber || null,
    })
    .returning()
    .get();

  return NextResponse.json({ entry: created }, { status: 201 });
}, "timetables:manage");

export const DELETE = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const institutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(timetableEntries.id, id), eq(timetableEntries.institutionId, institutionId))
    : eq(timetableEntries.id, id);

  const existing = await db.select().from(timetableEntries).where(whereClause).get();
  if (!existing) {
    return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });
  }

  await db.delete(timetableEntries).where(whereClause).run();

  return NextResponse.json({ success: true, deletedId: id });
}, "timetables:manage");
