import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, bookingResources, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { withBookingLock, hasOverlappingBooking } from "@/lib/bookings/ledger";
import { bookingUpdateSchema } from "@/lib/validation/schemas";
import { eq } from "drizzle-orm";
import type { StaffRole } from "@/types";

const ADMIN_ROLES: StaffRole[] = ["super_admin", "admin", "principal", "hod"];

export const GET = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const booking = await db
    .select({
      id: bookings.id,
      resourceId: bookings.resourceId,
      bookerId: bookings.bookerId,
      title: bookings.title,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      notes: bookings.notes,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      resourceName: bookingResources.name,
      resourceType: bookingResources.type,
      resourceLocation: bookingResources.location,
      resourceCapacity: bookingResources.capacity,
      resourceInstitutionId: bookingResources.institutionId,
      bookingInstitutionId: bookings.institutionId,
      bookerFirstName: staff.firstName,
      bookerLastName: staff.lastName,
      bookerEmail: staff.email,
    })
    .from(bookings)
    .leftJoin(bookingResources, eq(bookings.resourceId, bookingResources.id))
    .leftJoin(staff, eq(bookings.bookerId, staff.id))
    .where(eq(bookings.id, id))
    .get();

  if (!booking) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  const effectiveInst = booking.bookingInstitutionId || booking.resourceInstitutionId;
  if (institutionId && institutionId !== "global" && effectiveInst && effectiveInst !== institutionId) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  // Non-managers can only inspect their own bookings or public approved/confirmed bookings
  const isAdmin = ADMIN_ROLES.includes(session.role as StaffRole);
  if (!isAdmin && booking.bookerId !== session.staffId && !["approved", "confirmed"].includes(booking.status)) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  return NextResponse.json({ booking });
}, "bookings:read");

export const PATCH = requireAuth(async (request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bookingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid update payload" }, { status: 400 });
  }

  const booking = await db
    .select({
      id: bookings.id,
      resourceId: bookings.resourceId,
      bookerId: bookings.bookerId,
      status: bookings.status,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      notes: bookings.notes,
      bookingInstitutionId: bookings.institutionId,
      resourceInstitutionId: bookingResources.institutionId,
    })
    .from(bookings)
    .leftJoin(bookingResources, eq(bookings.resourceId, bookingResources.id))
    .where(eq(bookings.id, id))
    .get();

  if (!booking) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  const effectiveInst = booking.bookingInstitutionId || booking.resourceInstitutionId;
  if (institutionId && institutionId !== "global" && effectiveInst && effectiveInst !== institutionId) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  const isAdmin = ADMIN_ROLES.includes(session.role as StaffRole);
  const isBooker = booking.bookerId === session.staffId;

  if (!isAdmin && !isBooker) {
    return NextResponse.json({ error: "Unauthorized to update this booking" }, { status: 403 });
  }

  const isPast = new Date(booking.endTime).getTime() < Date.now();
  if (isPast) {
    return NextResponse.json({ error: "Cannot modify a completed past booking" }, { status: 400 });
  }

  const { title, notes, description, status, cancellationReason } = parsed.data;

  // Non-admins cannot approve/confirm their own booking
  if (status && ["approved", "confirmed"].includes(status) && !isAdmin) {
    return NextResponse.json({ error: "Forbidden: Only designated managers can approve bookings" }, { status: 403 });
  }

  // Handle status transitions
  if (status === "cancelled") {
    if (booking.status === "cancelled" || booking.status === "rejected") {
      return NextResponse.json({ error: "Booking is already in a terminal state" }, { status: 400 });
    }
  }

  // If status is transitioning to approved/confirmed, ensure slot availability under lock
  if (status && ["approved", "confirmed"].includes(status) && booking.status !== status) {
    const conflict = await withBookingLock(booking.resourceId, async () => {
      return await hasOverlappingBooking(booking.resourceId, booking.startTime, booking.endTime, booking.id, [
        "confirmed",
        "approved",
      ]);
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Booking time slot overlaps with an active booking and cannot be approved" },
        { status: 409 }
      );
    }
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (title !== undefined) updateData.title = title;
  if (status !== undefined) updateData.status = status;

  const noteAddition = cancellationReason ? `Cancellation reason: ${cancellationReason}` : null;
  const baseNotes = notes !== undefined ? notes : (description !== undefined ? description : booking.notes);
  if (noteAddition) {
    updateData.notes = baseNotes ? `${baseNotes}\n${noteAddition}` : noteAddition;
  } else if (notes !== undefined || description !== undefined) {
    updateData.notes = baseNotes;
  }

  const updated = await db
    .update(bookings)
    .set(updateData)
    .where(eq(bookings.id, id))
    .returning()
    .get();

  return NextResponse.json({ booking: updated });
}, "bookings:create");

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const booking = await db
    .select({
      id: bookings.id,
      bookerId: bookings.bookerId,
      status: bookings.status,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      resourceInstitutionId: bookingResources.institutionId,
      bookingInstitutionId: bookings.institutionId,
    })
    .from(bookings)
    .leftJoin(bookingResources, eq(bookings.resourceId, bookingResources.id))
    .where(eq(bookings.id, id))
    .get();

  if (!booking) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  const effectiveInst = booking.bookingInstitutionId || booking.resourceInstitutionId;
  if (institutionId && institutionId !== "global" && effectiveInst && effectiveInst !== institutionId) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  const isAdmin = ADMIN_ROLES.includes(session.role as StaffRole);
  if (!isAdmin && booking.bookerId !== session.staffId) {
    return NextResponse.json({ error: "Unauthorized to cancel this booking" }, { status: 403 });
  }

  // Prevent deleting or cancelling past completed bookings
  const isPast = new Date(booking.endTime).getTime() < Date.now();
  if (isPast) {
    return NextResponse.json({ error: "Cannot cancel or delete a completed past booking" }, { status: 400 });
  }

  // If already approved or confirmed, soft-cancel to preserve audit log while freeing slot
  if (booking.status === "approved" || booking.status === "confirmed") {
    await db
      .update(bookings)
      .set({
        status: "cancelled",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(bookings.id, id))
      .run();
    return NextResponse.json({ success: true, status: "cancelled" });
  }

  // If pending or rejected, delete the record
  await db.delete(bookings).where(eq(bookings.id, id)).run();
  return NextResponse.json({ success: true, status: "deleted" });
}, "bookings:create");
