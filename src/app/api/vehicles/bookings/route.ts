import { NextResponse } from "next/server";
import { db } from "@/db";
import { vehicleBookings, vehicles, staff } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { vehicleBookingSchema } from "@/lib/validation/schemas";
import {
  withVehicleLock,
  isTimeOverlapping,
  parseTimeToMinutes,
  isTerminalBookingStatus,
} from "@/lib/vehicles/ledger";
import { eq, and, desc, inArray } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const requestedInst = url.searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);

  let query = db
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
    .$dynamic();

  // Institution filtering
  if (scopedInstId !== "global") {
    query = query.where(eq(vehicles.institutionId, scopedInstId));
  }

  // Non-managers only see their own bookings
  const isManager = session.role === "super_admin" || session.role === "admin" || session.role === "principal" || session.role === "hod";
  if (!isManager && session.staffId) {
    query = query.where(eq(vehicleBookings.bookedById, session.staffId));
  }

  const bookings = await query.orderBy(desc(vehicleBookings.createdAt)).all();

  return NextResponse.json({ bookings });
}, "vehicles:read");

export const POST = requireAuth(async (request: Request, session) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`vehicles:book:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = vehicleBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid booking request parameters", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { vehicleId, date, startTime, endTime, purpose, destination, notes } = parsed.data;

  // Staff ID requirement
  if (!session.staffId) {
    return NextResponse.json(
      { error: "A valid staff profile is required to request vehicle bookings" },
      { status: 400 }
    );
  }

  // Temporal validation: past date check
  const today = new Date().toISOString().split("T")[0];
  if (date < today) {
    return NextResponse.json({ error: "Booking date cannot be in the past" }, { status: 400 });
  }

  // Time sequence validation
  if (endTime && parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime)) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  // Fetch vehicle & verify existence and tenant scoping
  const scopedInstId = await resolveRequestInstitution(session, null);
  const vehicle = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).get();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  if (scopedInstId !== "global" && vehicle.institutionId && vehicle.institutionId !== scopedInstId) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  if (!vehicle.isActive) {
    return NextResponse.json({ error: "Vehicle is currently inactive or decommissioned" }, { status: 400 });
  }

  return withVehicleLock(vehicleId, async () => {
    // Check for overlapping bookings
    const existingBookings = await db
      .select({
        id: vehicleBookings.id,
        startTime: vehicleBookings.startTime,
        endTime: vehicleBookings.endTime,
        status: vehicleBookings.status,
      })
      .from(vehicleBookings)
      .where(
        and(
          eq(vehicleBookings.vehicleId, vehicleId),
          eq(vehicleBookings.date, date),
          inArray(vehicleBookings.status, ["approved", "pending"])
        )
      )
      .all();

    for (const b of existingBookings) {
      if (isTimeOverlapping(startTime, endTime, b.startTime, b.endTime)) {
        return NextResponse.json(
          {
            error: "Vehicle is already booked or has a pending reservation for the requested time window",
            conflictingBookingId: b.id,
          },
          { status: 409 }
        );
      }
    }

    const booking = await db
      .insert(vehicleBookings)
      .values({
        id: crypto.randomUUID(),
        vehicleId,
        bookedById: session.staffId!,
        date,
        startTime,
        endTime: endTime || null,
        purpose,
        destination: destination || null,
        status: "pending",
        notes: notes || null,
      })
      .returning()
      .get();

    await logActivity({
      request,
      action: "create",
      resourceType: "vehicle_booking",
      resourceId: booking.id,
      staffId: session.staffId,
      details: { vehicleId, date, startTime, purpose },
    });

    return NextResponse.json({ booking }, { status: 201 });
  });
}, "fleet:book");

export const PATCH = requireAuth(async (request: Request, session) => {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const bookingId = body.bookingId || body.id;
  const status = body.status;
  const notes = body.notes;

  if (!bookingId || !["approved", "rejected", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const existing = await db
    .select({
      id: vehicleBookings.id,
      vehicleId: vehicleBookings.vehicleId,
      date: vehicleBookings.date,
      startTime: vehicleBookings.startTime,
      endTime: vehicleBookings.endTime,
      status: vehicleBookings.status,
      notes: vehicleBookings.notes,
      vehicleInstitutionId: vehicles.institutionId,
    })
    .from(vehicleBookings)
    .innerJoin(vehicles, eq(vehicleBookings.vehicleId, vehicles.id))
    .where(eq(vehicleBookings.id, bookingId))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  const scopedInstId = await resolveRequestInstitution(session, null);
  if (scopedInstId !== "global" && existing.vehicleInstitutionId && existing.vehicleInstitutionId !== scopedInstId) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  if (isTerminalBookingStatus(existing.status)) {
    return NextResponse.json(
      { error: `Cannot update booking that is already in '${existing.status}' status` },
      { status: 400 }
    );
  }

  return withVehicleLock(existing.vehicleId, async () => {
    // If approving, verify that no OTHER booking was approved for this time slot
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
        if (b.id !== bookingId && isTimeOverlapping(existing.startTime, existing.endTime, b.startTime, b.endTime)) {
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
      .where(and(eq(vehicleBookings.id, bookingId), eq(vehicleBookings.status, existing.status)))
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
      resourceId: bookingId,
      staffId: session.staffId,
      details: { newStatus: status, previousStatus: existing.status },
    });

    return NextResponse.json({ booking: updated });
  });
}, "vehicles:manage");
