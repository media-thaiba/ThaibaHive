import { NextResponse } from "next/server";
import { db } from "@/db";
import { staffShifts, staff, shifts, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { adminStaffShiftCreateSchema } from "@/lib/validation/schemas";
import { eq, desc, and } from "drizzle-orm";
import crypto from "crypto";

export const GET = requireAuth(async (_request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;

  if (instScope) {
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
      .innerJoin(staffInstitutions, eq(staffShifts.staffId, staffInstitutions.staffId))
      .leftJoin(staff, eq(staffShifts.staffId, staff.id))
      .leftJoin(shifts, eq(staffShifts.shiftId, shifts.id))
      .where(eq(staffInstitutions.institutionId, instScope))
      .orderBy(desc(staffShifts.effectiveFrom))
      .all();

    return NextResponse.json({ assignments: all });
  }

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

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = adminStaffShiftCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const { staffId, shiftId, effectiveFrom, effectiveTo } = parsed.data;

  // Verify shift exists
  const shift = await db.select().from(shifts).where(eq(shifts.id, shiftId)).get();
  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  // Verify staff exists
  const targetStaff = await db.select({ id: staff.id }).from(staff).where(eq(staff.id, staffId)).get();
  if (!targetStaff) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;
  if (instScope) {
    const member = await db
      .select({ id: staffInstitutions.id })
      .from(staffInstitutions)
      .where(
        and(
          eq(staffInstitutions.staffId, staffId),
          eq(staffInstitutions.institutionId, instScope)
        )
      )
      .get();
    if (!member) {
      return NextResponse.json({ error: "Forbidden: Staff does not belong to your institution" }, { status: 403 });
    }
  }

  // Check if staff already has an assignment for this effective date
  const existingAssignment = await db
    .select({ id: staffShifts.id })
    .from(staffShifts)
    .where(
      and(
        eq(staffShifts.staffId, staffId),
        eq(staffShifts.effectiveFrom, effectiveFrom)
      )
    )
    .get();

  if (existingAssignment) {
    return NextResponse.json(
      { error: "This staff member already has a shift assignment for this effective date" },
      { status: 409 }
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
  } catch (err: unknown) {
    const errStr = `${String(err)} ${(err as any)?.cause ? String((err as any).cause) : ""}`;
    if (errStr.includes("UNIQUE") || errStr.includes("unique") || errStr.includes("duplicate")) {
      return NextResponse.json(
        { error: "This staff member already has a shift assignment for this effective date" },
        { status: 409 }
      );
    }
    throw err;
  }
}, "attendance:manage");

export const DELETE = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
  }

  const existing = await db.select().from(staffShifts).where(eq(staffShifts.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Shift assignment not found" }, { status: 404 });
  }

  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;
  if (instScope) {
    const member = await db
      .select({ id: staffInstitutions.id })
      .from(staffInstitutions)
      .where(
        and(
          eq(staffInstitutions.staffId, existing.staffId),
          eq(staffInstitutions.institutionId, instScope)
        )
      )
      .get();
    if (!member) {
      return NextResponse.json({ error: "Shift assignment not found" }, { status: 404 });
    }
  }

  await db.delete(staffShifts).where(eq(staffShifts.id, id)).run();
  return NextResponse.json({ success: true });
}, "attendance:manage");
