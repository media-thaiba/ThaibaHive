import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventRsvps, staff, staffDepartments, staffInstitutions } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eventCreateSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { eq, desc, and, or, isNull, inArray, sql } from "drizzle-orm";
import { createNotificationsForTarget } from "@/lib/api/notifications";
import type { StaffRole } from "@/types";

const ADMIN_ROLES: StaffRole[] = ["super_admin", "admin", "principal", "hod"];

export const GET = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const isManager = ADMIN_ROLES.includes(session.role as StaffRole);

  if (isManager) {
    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId, session);
    let managerWhere = undefined;
    if (scopedInstitutionId && scopedInstitutionId !== "global") {
      managerWhere = or(isNull(events.institutionId), eq(events.institutionId, scopedInstitutionId));
    }

    // Admin/Manager/HOD: Retrieve all active and inactive events along with counts of RSVPs categorized by status
    const all = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        eventType: events.eventType,
        startDate: events.startDate,
        endDate: events.endDate,
        location: events.location,
        maxAttendees: events.maxAttendees,
        createdById: events.createdById,
        createdByName: staff.firstName,
        createdByLastName: staff.lastName,
        isActive: events.isActive,
        myRsvpStatus: eventRsvps.status,
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
      .leftJoin(
        eventRsvps,
        and(eq(eventRsvps.eventId, events.id), eq(eventRsvps.staffId, session.staffId))
      )
      .where(managerWhere)
      .orderBy(desc(events.startDate))
      .all();

    return NextResponse.json({ events: all });
  }

  // Standard Staff: Retrieve only active events targeted to their scopes
  const userDepts = await db
    .select({ departmentId: staffDepartments.departmentId })
    .from(staffDepartments)
    .where(eq(staffDepartments.staffId, session.staffId))
    .all();
  const deptIds = userDepts.map((d) => d.departmentId).filter(Boolean);

  const userInsts = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId))
    .all();
  const instIds = userInsts.map((i) => i.institutionId).filter(Boolean);

  const isHolidayOrInst = and(
    or(eq(events.eventType, "holiday"), eq(events.eventType, "institution")),
    or(
      isNull(events.institutionId),
      instIds.length > 0 ? inArray(events.institutionId, instIds) : sql`1=0`
    )
  );

  const isDeptTargeted = and(
    eq(events.eventType, "department"),
    deptIds.length > 0 ? inArray(events.departmentId, deptIds) : sql`1=0`
  );

  const isMeetingTargeted = and(
    eq(events.eventType, "meeting"),
    or(isNull(events.departmentId), deptIds.length > 0 ? inArray(events.departmentId, deptIds) : sql`1=0`),
    or(isNull(events.institutionId), instIds.length > 0 ? inArray(events.institutionId, instIds) : sql`1=0`)
  );

  const targetingClause = or(isHolidayOrInst, isDeptTargeted, isMeetingTargeted);

  const staffEvents = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      eventType: events.eventType,
      startDate: events.startDate,
      endDate: events.endDate,
      location: events.location,
      maxAttendees: events.maxAttendees,
      createdById: events.createdById,
      createdByName: staff.firstName,
      createdByLastName: staff.lastName,
      isActive: events.isActive,
      myRsvpStatus: eventRsvps.status,
    })
    .from(events)
    .leftJoin(staff, eq(events.createdById, staff.id))
    .leftJoin(
      eventRsvps,
      and(eq(eventRsvps.eventId, events.id), eq(eventRsvps.staffId, session.staffId))
    )
    .where(and(eq(events.isActive, true), targetingClause))
    .orderBy(desc(events.startDate))
    .all();

  return NextResponse.json({ events: staffEvents });
}, "events:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = eventCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const {
    title,
    description,
    eventType,
    startDate,
    endDate,
    location,
    departmentId,
    institutionId,
    maxAttendees,
  } = parsed.data;

  if (institutionId) {
    await resolveRequestInstitution(session, institutionId);
  }

  const event = await db
    .insert(events)
    .values({
      id: randomUUID(),
      title,
      description: description ?? null,
      eventType: eventType || "institution",
      startDate,
      endDate: endDate ?? null,
      location: location ?? null,
      departmentId: departmentId ?? null,
      institutionId: institutionId ?? null,
      createdById: session.staffId,
      maxAttendees: maxAttendees ?? null,
    })
    .returning()
    .get();

  // Send auto-notifications (fail-soft)
  try {
    await createNotificationsForTarget({
      title: `New Event: ${title}`,
      message: `${location ? `At ${location}. ` : ""}Date: ${startDate}${endDate ? ` to ${endDate}` : ""}`,
      type: "event",
      referenceType: "event",
      referenceId: event.id,
      targetRole: undefined,
      targetDepartmentId: departmentId ?? undefined,
      targetInstitutionId: institutionId ?? undefined,
    });
  } catch (err) {
    console.warn("[Events] Failed to deliver event notifications:", err);
  }

  return NextResponse.json({ event }, { status: 201 });
}, "events:create");
