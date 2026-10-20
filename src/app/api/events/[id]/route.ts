import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventRsvps, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { eventUpdateSchema } from "@/lib/validation/schemas";
import { eq, and, or, isNull, sql } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId, session);

  const whereClause =
    scopedInstitutionId && scopedInstitutionId !== "global"
      ? and(eq(events.id, id), or(isNull(events.institutionId), eq(events.institutionId, scopedInstitutionId)))
      : eq(events.id, id);

  const event = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      eventType: events.eventType,
      startDate: events.startDate,
      endDate: events.endDate,
      location: events.location,
      maxAttendees: events.maxAttendees,
      departmentId: events.departmentId,
      institutionId: events.institutionId,
      createdById: events.createdById,
      createdByName: staff.firstName,
      createdByLastName: staff.lastName,
      isActive: events.isActive,
      attendingCount: sql<number>`(
        SELECT COUNT(*) FROM ${eventRsvps}
        WHERE ${eventRsvps.eventId} = ${events.id} AND ${eventRsvps.status} = 'attending'
      )`.as("attending_count"),
      maybeCount: sql<number>`(
        SELECT COUNT(*) FROM ${eventRsvps}
        WHERE ${eventRsvps.eventId} = ${events.id} AND ${eventRsvps.status} = 'maybe'
      )`.as("maybe_count"),
      declinedCount: sql<number>`(
        SELECT COUNT(*) FROM ${eventRsvps}
        WHERE ${eventRsvps.eventId} = ${events.id} AND ${eventRsvps.status} = 'declined'
      )`.as("declined_count"),
    })
    .from(events)
    .leftJoin(staff, eq(events.createdById, staff.id))
    .where(whereClause)
    .get();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}, "events:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = eventUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId, session);
  const whereClause =
    scopedInstitutionId && scopedInstitutionId !== "global"
      ? and(eq(events.id, id), or(isNull(events.institutionId), eq(events.institutionId, scopedInstitutionId)))
      : eq(events.id, id);

  const existing = await db.select({ id: events.id }).from(events).where(whereClause).get();
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };

  const updated = await db
    .update(events)
    .set(updates)
    .where(whereClause)
    .returning()
    .get();

  return NextResponse.json({ event: updated });
}, "events:manage");

export const DELETE = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId, session);

  const whereClause =
    institutionId && institutionId !== "global"
      ? and(eq(events.id, id), or(isNull(events.institutionId), eq(events.institutionId, institutionId)))
      : eq(events.id, id);

  const existing = await db.select({ id: events.id }).from(events).where(whereClause).get();
  if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  await db.delete(eventRsvps).where(eq(eventRsvps.eventId, id)).run();
  await db.delete(events).where(whereClause).run();
  return NextResponse.json({ success: true });
}, "events:manage");
