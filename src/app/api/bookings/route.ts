import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, bookingResources, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { bookingCreateSchema } from "@/lib/validation/schemas";
import { eq, and, desc, gte, lte, lt, gt, or, inArray } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const resourceId = url.searchParams.get("resourceId");
  const date = url.searchParams.get("date");
  const conditions = [];

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  if (scopedInstitutionId && scopedInstitutionId !== "global") {
    conditions.push(eq(bookings.institutionId, scopedInstitutionId));
  }

  if (resourceId) conditions.push(eq(bookings.resourceId, resourceId));
  if (date) {
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;
    conditions.push(gte(bookings.startTime, dayStart), lte(bookings.startTime, dayEnd));
  }

  // Staff (non-admin/hod/principal) only see their own bookings or confirmed/approved public bookings
  const isAdminRole = ["super_admin", "admin", "principal", "hod"].includes(session.role);
  if (!isAdminRole) {
    conditions.push(
      or(
        eq(bookings.bookerId, session.staffId),
        inArray(bookings.status, ["confirmed", "approved"])
      )!
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
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bookingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking parameters", details: parsed.error.format() }, { status: 400 });
  }

  const { resourceId, title, startTime, endTime, notes, description } = parsed.data;
  const noteText = notes || description || null;
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);

  // Resource must exist inside the caller's tenant scope (blocks cross-tenant booking IDOR)
  const resourceWhere = scopedInstitutionId && scopedInstitutionId !== "global"
    ? and(eq(bookingResources.id, resourceId), eq(bookingResources.institutionId, scopedInstitutionId))
    : eq(bookingResources.id, resourceId);
  const resource = await db.select({ id: bookingResources.id }).from(bookingResources).where(resourceWhere).get();
  if (!resource) {
    return NextResponse.json({ error: "Booking resource not found" }, { status: 404 });
  }

  // Overlap check + insert atomically so concurrent requests cannot double-book the slot.
  // Any active booking (pending/confirmed/approved) holds the slot; rejected/cancelled release it.
  const booking = await db.transaction(async (tx) => {
    const overlapping = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.resourceId, resourceId),
          inArray(bookings.status, ["pending", "confirmed", "approved"]),
          lt(bookings.startTime, endTime),
          gt(bookings.endTime, startTime)
        )
      )
      .get();

    if (overlapping) return null;

    return await tx
      .insert(bookings)
      .values({
        id: crypto.randomUUID(),
        resourceId,
        title,
        startTime,
        endTime,
        notes: noteText,
        bookerId: session.staffId,
        status: "pending",
        institutionId: scopedInstitutionId !== "global" ? scopedInstitutionId : null,
      })
      .returning()
      .get();
  });

  if (!booking) {
    return NextResponse.json({ error: "Time slot overlaps with an existing booking" }, { status: 409 });
  }

  return NextResponse.json({ booking }, { status: 201 });
}, "bookings:create");