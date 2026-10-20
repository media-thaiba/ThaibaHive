import { NextResponse } from "next/server";
import { db } from "@/db";
import { shifts, departments, staffShifts } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { pick } from "@/lib/api/pick";
import { eq } from "drizzle-orm";
import { adminShiftUpdateSchema } from "@/lib/validation/schemas";

export const GET = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const shift = await db.select().from(shifts).where(eq(shifts.id, id)).get();
  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;
  if (instScope && shift.departmentId) {
    const dept = await db
      .select({ institutionId: departments.institutionId })
      .from(departments)
      .where(eq(departments.id, shift.departmentId))
      .get();
    if (dept && dept.institutionId && dept.institutionId !== instScope) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ shift });
}, "attendance:manage");

export const PUT = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = adminShiftUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const existing = await db.select().from(shifts).where(eq(shifts.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;
  if (instScope && existing.departmentId) {
    const dept = await db
      .select({ institutionId: departments.institutionId })
      .from(departments)
      .where(eq(departments.id, existing.departmentId))
      .get();
    if (dept && dept.institutionId && dept.institutionId !== instScope) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }
  }

  // If departmentId is being modified, verify the new department exists & belongs to tenant
  if (parsed.data.departmentId) {
    const targetDept = await db
      .select({ id: departments.id, institutionId: departments.institutionId })
      .from(departments)
      .where(eq(departments.id, parsed.data.departmentId))
      .get();
    if (!targetDept) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    if (instScope && targetDept.institutionId !== instScope) {
      return NextResponse.json({ error: "Department does not belong to your institution" }, { status: 403 });
    }
  }

  const updated = await db
    .update(shifts)
    .set({
      ...pick(parsed.data, ["name", "startTime", "endTime", "gracePeriodMinutes", "departmentId", "applicableToAll"]),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(shifts.id, id))
    .returning()
    .get();

  if (!updated) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  return NextResponse.json({ shift: updated });
}, "attendance:manage");

export const PATCH = PUT;

export const DELETE = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const existing = await db.select().from(shifts).where(eq(shifts.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;
  if (instScope && existing.departmentId) {
    const dept = await db
      .select({ institutionId: departments.institutionId })
      .from(departments)
      .where(eq(departments.id, existing.departmentId))
      .get();
    if (dept && dept.institutionId && dept.institutionId !== instScope) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }
  }

  // Conflict check: prevent deletion if active staff assignments reference this shift
  const activeAssignments = await db
    .select({ id: staffShifts.id })
    .from(staffShifts)
    .where(eq(staffShifts.shiftId, id))
    .all();

  if (activeAssignments.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete shift with active staff assignments" },
      { status: 409 }
    );
  }

  await db.delete(shifts).where(eq(shifts.id, id)).run();
  return NextResponse.json({ success: true });
}, "attendance:manage");
