import { NextResponse } from "next/server";
import { db } from "@/db";
import { vehicleBookings, vehicles, staff } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { logActivity } from "@/lib/api/activity-log";
import { vehicleBookingUpdateSchema } from "@/lib/validation/schemas";
import {
  withVehicleLock,
  isTimeOverlapping,
  canAccessVehicleBooking,
  isTerminalBookingStatus,
} from "@/lib/vehicles/ledger";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });

  const scopedInstId = await resolveRequestInstitution(session, null);

  const booking = await db
    .select({
      id: vehicleBookings.id,
      vehicleId: vehicleBookings.vehicleId,
      registrationNumber: vehicles.registrationNumber,
      model: vehicles.model,
      vehicleType: vehicles.type,
      vehicleInstitutionId: vehicles.institutionId,
      bookedById: vehicleBookings.bookedById,
      bookerFirstName: staff.firstName,
      bookerLastName: staff.lastName,
      date: vehicleBookings.date,
      startTime: vehicleBookings.startTime,
      endTime: vehicleBookings.endTime,
      purpose: vehicleBookings.purpose,
      destination: vehicleBookings.destination,
      status: vehicleBookings.status,
      approvedById: vehicleBookings.approvedById,
      notes: vehicleBookings.notes,
      createdAt: vehicleBookings.createdAt,
    })
    .from(vehicleBookings)
    .innerJoin(vehicles, eq(vehicleBookings.vehicleId, vehicles.id))
    .leftJoin(staff, eq(vehicleBookings.bookedById, staff.id))
    .where(eq(vehicleBookings.id, id))
    .get();

  if (!booking) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  // Cross-tenant check: fail-closed 404
  if (scopedInstId !== "global" && booking.vehicleInstitutionId && booking.vehicleInstitutionId !== scopedInstId) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  // Authorization check
  const allowed = canAccessVehicleBooking(
    { bookedById: booking.bookedById },
    { institutionId: booking.vehicleInstitutionId },
    session,
    scopedInstId
  );

  if (!allowed) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  return NextResponse.json({ booking });
}, "vehicles:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });

  const scopedInstId = await resolveRequestInstitution(session, null);

  const existing = await db
    .select({
      id: vehicleBookings.id,
      vehicleId: vehicleBookings.vehicleId,
      bookedById: vehicleBookings.bookedById,
      date: vehicleBookings.date,
      startTime: vehicleBookings.startTime,
      endTime: vehicleBookings.endTime,
      status: vehicleBookings.status,
      notes: vehicleBookings.notes,
      vehicleInstitutionId: vehicles.institutionId,
    })
    .from(vehicleBookings)
    .innerJoin(vehicles, eq(vehicleBookings.vehicleId, vehicles.id))
    .where(eq(vehicleBookings.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  if (scopedInstId !== "global" && existing.vehicleInstitutionId && existing.vehicleInstitutionId !== scopedInstId) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = vehicleBookingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { status, notes } = parsed.data;

  // Terminal state immutability
  if (isTerminalBookingStatus(existing.status)) {
    return NextResponse.json(
      { error: `Cannot update booking that is already in '${existing.status}' status` },
      { status: 400 }
    );
  }

  return withVehicleLock(existing.vehicleId, async () => {
    // If approving, verify that no OTHER booking is already approved for this time slot
    if (status === "approved") {
      const conflictingApproved = await db
        .select({ id: vehicleBookings.id, startTime: vehicleBookings.startTime, endTime: vehicleBookings.endTime })
        .from(vehicleBookings)
        .where(
          and(
            eq(vehicleBookings.vehicleId, existing.vehicleId),
            eq(vehicleBookings.date, existing.date),
            eq(vehicleBookings.status, "approved")
          )
        )
        .all();

      for (const b of conflictingApproved) {
        if (b.id !== id && isTimeOverlapping(existing.startTime, existing.endTime, b.startTime, b.endTime)) {
          return NextResponse.json(
            { error: "Another booking has already been approved for this time slot" },
            { status: 409 }
          );
        }
      }
    }

    const updated = await db
      .update(vehicleBookings)
      .set({
        status,
        approvedById: session.staffId || null,
        notes: notes ? `${existing.notes || ""}\n[Review]: ${notes}`.trim() : existing.notes,
      })
      .where(and(eq(vehicleBookings.id, id), eq(vehicleBookings.status, existing.status)))
      .returning()
      .get();

    if (!updated) {
      return NextResponse.json(
        { error: "Booking was modified concurrently by another process" },
        { status: 409 }
      );
    }

    await logActivity({
      request,
      action: "update",
      resourceType: "vehicle_booking",
      resourceId: id,
      staffId: session.staffId,
      details: { newStatus: status, previousStatus: existing.status },
    });

    return NextResponse.json({ booking: updated });
  });
}, "vehicles:manage");

export const DELETE = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });

  const scopedInstId = await resolveRequestInstitution(session, null);

  const existing = await db
    .select({
      id: vehicleBookings.id,
      vehicleId: vehicleBookings.vehicleId,
      bookedById: vehicleBookings.bookedById,
      status: vehicleBookings.status,
      vehicleInstitutionId: vehicles.institutionId,
    })
    .from(vehicleBookings)
    .innerJoin(vehicles, eq(vehicleBookings.vehicleId, vehicles.id))
    .where(eq(vehicleBookings.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  // Multi-tenant check: fail-closed 404
  if (scopedInstId !== "global" && existing.vehicleInstitutionId && existing.vehicleInstitutionId !== scopedInstId) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  const isOwner = Boolean(session.staffId && existing.bookedById === session.staffId);
  const isManager = Boolean(
    session.role === "super_admin" ||
    session.role === "admin" ||
    session.role === "principal" ||
    session.role === "hod"
  );

  // If neither owner nor manager, forbid
  if (!isOwner && !isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Withdrawal parity check for owner
  if (isOwner && !isManager) {
    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending bookings can be withdrawn directly" },
        { status: 400 }
      );
    }
  }

  return withVehicleLock(existing.vehicleId, async () => {
    // Soft-cancel instead of hard delete to preserve audit history
    await db
      .update(vehicleBookings)
      .set({
        status: "cancelled",
        notes: `[Withdrawn/Cancelled by ${session.role || "user"} on ${new Date().toISOString()}]`,
      })
      .where(eq(vehicleBookings.id, id))
      .run();

    await logActivity({
      request,
      action: "delete",
      resourceType: "vehicle_booking",
      resourceId: id,
      staffId: session.staffId,
      details: { action: "withdrawn_or_cancelled", previousStatus: existing.status },
    });

    return NextResponse.json({ success: true, message: "Booking withdrawn successfully" });
  });
}, "vehicles:read");
