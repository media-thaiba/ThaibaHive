import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { reportSchedules } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { reportScheduleCreateSchema } from "@/lib/validation/schemas";
import { getActorInstitutionIds } from "@/lib/api/tenant-scope";

export const GET = requireAuth(async (request, session) => {
  const { staffId } = session;

  const actorInstIds = await getActorInstitutionIds(staffId);
  const institutionId = Array.from(actorInstIds)[0];

  if (!institutionId) {
    return NextResponse.json({ error: "Institution ID is required" }, { status: 400 });
  }

  const schedules = await db
    .select()
    .from(reportSchedules)
    .where(
      and(
        eq(reportSchedules.institutionId, institutionId),
        eq(reportSchedules.userId, staffId)
      )
    )
    .all();

  return NextResponse.json({ schedules });
}, "reports:read");

export const POST = requireAuth(async (request, session) => {
  const { staffId } = session;

  const actorInstIds = await getActorInstitutionIds(staffId);
  const institutionId = Array.from(actorInstIds)[0];

  if (!institutionId) {
    return NextResponse.json({ error: "Institution ID is required" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = reportScheduleCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, frequency, format, recipients, isActive } = parsed.data;

  const id = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  await db
    .insert(reportSchedules)
    .values({
      id,
      institutionId,
      userId: staffId,
      title,
      frequency,
      format,
      recipients: JSON.stringify(recipients),
      isActive,
    })
    .run();

  const schedule = await db
    .select()
    .from(reportSchedules)
    .where(eq(reportSchedules.id, id))
    .get();

  return NextResponse.json({ schedule }, { status: 201 });
}, "reports:read");
