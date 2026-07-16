import { NextResponse } from "next/server";
import { db } from "@/db";
import { staffShifts, staff, shifts } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const all = await db
    .select({
      id: staffShifts.id,
      staffId: staffShifts.staffId,
      shiftId: staffShifts.shiftId,
      effectiveFrom: staffShifts.effectiveFrom,
      effectiveTo: staffShifts.effectiveTo,
      staffName: staff.firstName,
      staffLastName: staff.lastName,
      employeeId: staff.employeeId,
      designation: staff.designation,
      shiftName: shifts.name,
      shiftStartTime: shifts.startTime,
      shiftEndTime: shifts.endTime,
    })
    .from(staffShifts)
    .leftJoin(staff, eq(staffShifts.staffId, staff.id))
    .leftJoin(shifts, eq(staffShifts.shiftId, shifts.id))
    .orderBy(desc(staffShifts.effectiveFrom))
    .all();

  return NextResponse.json({ assignments: all });
}, "attendance:manage");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { staffId, shiftId, effectiveFrom, effectiveTo } = body;

  if (!staffId || !shiftId || !effectiveFrom) {
    return NextResponse.json(
      { error: "staffId, shiftId, and effectiveFrom are required" },
      { status: 400 }
    );
  }

  try {
    const assignment = await db
      .insert(staffShifts)
      .values({
        id: crypto.randomUUID(),
        staffId,
        shiftId,
        effectiveFrom,
        effectiveTo: effectiveTo || null,
      })
      .returning()
      .get();

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes("UNIQUE") || err.message?.includes("unique")) {
      return NextResponse.json(
        { error: "This staff member already has a shift assignment for this effective date" },
        { status: 409 }
      );
    }
    throw err;
  }
}, "attendance:manage");

export const DELETE = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
  }

  await db.delete(staffShifts).where(eq(staffShifts.id, id)).run();
  return NextResponse.json({ success: true });
}, "attendance:manage");
