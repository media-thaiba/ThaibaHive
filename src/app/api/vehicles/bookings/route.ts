import { NextResponse } from "next/server";
import { db } from "@/db";
import { vehicleBookings, vehicles } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { vehicleBookingSchema } from "@/lib/validation/schemas";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const bookings = await db
    .select({
      id: vehicleBookings.id,
      vehicleId: vehicleBookings.vehicleId,
      registrationNumber: vehicles.registrationNumber,
      model: vehicles.model,
      bookedById: vehicleBookings.bookedById,
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
    .leftJoin(vehicles, eq(vehicleBookings.vehicleId, vehicles.id))
    .orderBy(desc(vehicleBookings.createdAt))
    .all();

  return NextResponse.json({ bookings });
}, "vehicles:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const parsed = vehicleBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking request parameters", details: parsed.error.format() }, { status: 400 });
  }

  const { vehicleId, date, startTime, endTime, purpose, destination, notes } = parsed.data;

  const booking = await db
    .insert(vehicleBookings)
    .values({
      id: crypto.randomUUID(),
      vehicleId,
      bookedById: session.staffId || "staff_default",
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

  return NextResponse.json({ booking }, { status: 201 });
}, "fleet:book");

export const PATCH = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { bookingId, status, notes } = body;

  if (!bookingId || !["approved", "rejected", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const existing = await db.select().from(vehicleBookings).where(eq(vehicleBookings.id, bookingId)).get();
  if (!existing) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  const updated = await db
    .update(vehicleBookings)
    .set({
      status,
      approvedById: session.staffId || "staff_admin",
      notes: notes ? `${existing.notes || ""}\n[Review]: ${notes}`.trim() : existing.notes,
    })
    .where(eq(vehicleBookings.id, bookingId))
    .returning()
    .get();

  return NextResponse.json({ booking: updated });
}, "vehicles:manage");