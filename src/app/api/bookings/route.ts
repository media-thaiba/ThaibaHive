import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, bookingResources, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, desc, gte, lte, lt, gt } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const resourceId = url.searchParams.get("resourceId");
  const date = url.searchParams.get("date");
  const conditions = [];

  if (resourceId) conditions.push(eq(bookings.resourceId, resourceId));
  if (date) {
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;
    conditions.push(gte(bookings.startTime, dayStart), lte(bookings.startTime, dayEnd));
  }

  // Staff (non-admin/hod/principal) only see their own bookings or approved public bookings
  const isAdminRole = ["super_admin", "admin", "principal", "hod"].includes(session.role);
  if (!isAdminRole) {
    conditions.push(
      eq(bookings.bookerId, session.staffId)
    );
  }

  const all = await db
    .select({
      id: bookings.id,
      resourceId: bookings.resourceId,
      title: bookings.title,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      bookedByName: staff.firstName,
      bookedByLastName: staff.lastName,
      resourceName: bookingResources.name,
    })
    .from(bookings)
    .leftJoin(staff, eq(bookings.bookerId, staff.id))
    .leftJoin(bookingResources, eq(bookings.resourceId, bookingResources.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(bookings.startTime))
    .all();

  return NextResponse.json({ bookings: all });
}, "bookings:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { resourceId, title, startTime, endTime, description } = body;

  if (!resourceId || !title || !startTime || !endTime) {
    return NextResponse.json({ error: "Resource, title, start and end time required" }, { status: 400 });
  }

  // Check for overlapping bookings on the same resource
  const overlapping = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.resourceId, resourceId),
        eq(bookings.status, "confirmed"),
        lt(bookings.startTime, endTime),
        gt(bookings.endTime, startTime)
      )
    )
    .get();

  if (overlapping) {
    return NextResponse.json({ error: "Time slot overlaps with an existing confirmed booking" }, { status: 409 });
  }

  const booking = await db.insert(bookings).values({
    id: crypto.randomUUID(),
    resourceId,
    title,
    startTime,
    endTime,
    notes: description,
    bookerId: session.staffId,
    status: "confirmed",
  }).returning().get();

  return NextResponse.json({ booking }, { status: 201 });
}, "bookings:create");