import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { reportSchedules } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { reportScheduleCreateSchema } from "@/lib/validation/schemas";
import { getActorInstitutionIds } from "@/lib/api/tenant-scope";

export const GET = requireAuth(async (request, session, context) => {
  const { id } = await context!.params;
  const { staffId, role } = session;

  const schedule = await db
    .select()
    .from(reportSchedules)
    .where(eq(reportSchedules.id, id))
    .get();

  if (!schedule) {
    return NextResponse.json({ error: "Report schedule not found" }, { status: 404 });
  }

  const actorInstIds = await getActorInstitutionIds(staffId);

  // Enforce institution boundary and ownership (unless admin/super_admin)
  if (role !== "super_admin" && role !== "admin") {
    if (!actorInstIds.has(schedule.institutionId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (schedule.userId !== staffId && role !== "principal") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ schedule });
}, "reports:read");

export const PATCH = requireAuth(async (request, session, context) => {
  const { id } = await context!.params;
  const { staffId, role } = session;

  const schedule = await db
    .select()
    .from(reportSchedules)
    .where(eq(reportSchedules.id, id))
    .get();

  if (!schedule) {
    return NextResponse.json({ error: "Report schedule not found" }, { status: 404 });
  }

  const actorInstIds = await getActorInstitutionIds(staffId);

  if (role !== "super_admin" && role !== "admin") {
    if (!actorInstIds.has(schedule.institutionId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (schedule.userId !== staffId && role !== "principal") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const parsed = reportScheduleCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updateData: Record<string, any> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.frequency !== undefined) updateData.frequency = parsed.data.frequency;
  if (parsed.data.format !== undefined) updateData.format = parsed.data.format;
  if (parsed.data.recipients !== undefined) updateData.recipients = JSON.stringify(parsed.data.recipients);
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

  if (Object.keys(updateData).length > 0) {
    await db
      .update(reportSchedules)
      .set(updateData)
      .where(eq(reportSchedules.id, id))
      .run();
  }

  const updatedSchedule = await db
    .select()
    .from(reportSchedules)
    .where(eq(reportSchedules.id, id))
    .get();

  return NextResponse.json({ schedule: updatedSchedule });
}, "reports:read");

export const DELETE = requireAuth(async (request, session, context) => {
  const { id } = await context!.params;
  const { staffId, role } = session;

  const schedule = await db
    .select()
    .from(reportSchedules)
    .where(eq(reportSchedules.id, id))
    .get();

  if (!schedule) {
    return NextResponse.json({ error: "Report schedule not found" }, { status: 404 });
  }

  const actorInstIds = await getActorInstitutionIds(staffId);

  if (role !== "super_admin" && role !== "admin") {
    if (!actorInstIds.has(schedule.institutionId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (schedule.userId !== staffId && role !== "principal") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db
    .delete(reportSchedules)
    .where(eq(reportSchedules.id, id))
    .run();

  return NextResponse.json({ success: true });
}, "reports:read");
