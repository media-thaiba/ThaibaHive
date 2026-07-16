import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventRsvps, staff, staffDepartments, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eventCreateSchema } from "@/lib/validation/schemas";
import { eq, desc, and, or, isNull, inArray, sql } from "drizzle-orm";
import { createNotificationsForTarget } from "@/lib/api/notifications";
import type { StaffRole } from "@/types";

const ADMIN_ROLES: StaffRole[] = ["super_admin", "admin", "principal", "hod"];

export const GET = requireAuth(async (request, session) => {
  const isManager = ADMIN_ROLES.includes(session.role as StaffRole);

  if (isManager) {
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

  // Scopes matching:
  // - holiday / institution
  // - department (if in deptIds)
  // - meeting (if in deptIds and instIds)
  const isHolidayOrInst = or(eq(events.eventType, "holiday"), eq(events.eventType, "institution"));

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
  const body = await request.json();
  const parsed = eventCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { title, description, eventType, startDate, endDate, location, departmentId, institutionId, maxAttendees } = parsed.data;
  const event = await db
    .insert(events)
    .values({
      id: crypto.randomUUID(),
      title,
      description,
      eventType: eventType || "institution",
      startDate,
      endDate,
      location,
      departmentId,
      institutionId,
      createdById: session.staffId,
      maxAttendees,
    })
    .returning()
    .get();

  // Send auto-notifications
  await createNotificationsForTarget({
    title: `New Event: ${title}`,
    message: `${location ? `At ${location}. ` : ""}Date: ${startDate}${endDate ? ` to ${endDate}` : ""}`,
    type: "event",
    referenceType: "event",
    referenceId: event.id,
    targetRole: undefined,
    targetDepartmentId: departmentId,
    targetInstitutionId: institutionId,
  });

  return NextResponse.json({ event }, { status: 201 });
}, "events:create");