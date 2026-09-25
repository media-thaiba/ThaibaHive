import { NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles, vehicleBookings, vehicleLogs, institutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 });

  const vehicle = await db
    .select({
      id: vehicles.id,
      registrationNumber: vehicles.registrationNumber,
      model: vehicles.model,
      type: vehicles.type,
      capacity: vehicles.capacity,
      fuelType: vehicles.fuelType,
      isActive: vehicles.isActive,
      institutionId: vehicles.institutionId,
      institutionName: institutions.name,
      notes: vehicles.notes,
      createdAt: vehicles.createdAt,
    })
    .from(vehicles)
    .leftJoin(institutions, eq(vehicles.institutionId, institutions.id))
    .where(eq(vehicles.id, id))
    .get();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const bookings = await db
    .select()
    .from(vehicleBookings)
    .where(eq(vehicleBookings.vehicleId, id))
    .all();

  return NextResponse.json({ vehicle, bookings });
}, "vehicles:read");

export const PATCH = requireAuth(async (request: Request, _session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 });

  const existing = await db.select().from(vehicles).where(eq(vehicles.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (body.model !== undefined) updateData.model = body.model;
  if (body.registrationNumber !== undefined) updateData.registrationNumber = body.registrationNumber;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.capacity !== undefined) updateData.capacity = body.capacity;
  if (body.fuelType !== undefined) updateData.fuelType = body.fuelType;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const updated = await db
    .update(vehicles)
    .set(updateData)
    .where(eq(vehicles.id, id))
    .returning()
    .get();

  return NextResponse.json({ vehicle: updated });
}, "vehicles:manage");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 });

  const existing = await db.select().from(vehicles).where(eq(vehicles.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  await db.delete(vehicleLogs).where(eq(vehicleLogs.vehicleId, id)).run();
  await db.delete(vehicleBookings).where(eq(vehicleBookings.vehicleId, id)).run();
  await db.delete(vehicles).where(eq(vehicles.id, id)).run();
  return NextResponse.json({ success: true });
}, "vehicles:manage");
