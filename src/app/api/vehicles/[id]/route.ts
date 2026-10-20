import { NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles, vehicleBookings, vehicleLogs, fleetRoutes, fleetMaintenanceLogs, institutions } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { withVehicleLock } from "@/lib/vehicles/ledger";
import { eq, and, or } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 });

  const scopedInstId = await resolveRequestInstitution(session, null);
  const whereClause = scopedInstId && scopedInstId !== "global"
    ? and(eq(vehicles.id, id), eq(vehicles.institutionId, scopedInstId))
    : eq(vehicles.id, id);

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
    .where(whereClause)
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

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 });

  const scopedInstId = await resolveRequestInstitution(session, null);
  const whereClause = scopedInstId && scopedInstId !== "global"
    ? and(eq(vehicles.id, id), eq(vehicles.institutionId, scopedInstId))
    : eq(vehicles.id, id);

  const existing = await db.select().from(vehicles).where(whereClause).get();
  if (!existing) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`vehicles:update:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  return withVehicleLock(id, async () => {
    // If registration number is changing, verify uniqueness
    if (body.registrationNumber && body.registrationNumber !== existing.registrationNumber) {
      const duplicate = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(eq(vehicles.registrationNumber, body.registrationNumber))
        .get();

      if (duplicate) {
        return NextResponse.json(
          { error: "Vehicle with this registration number already exists" },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.model !== undefined) updateData.model = String(body.model).trim();
    if (body.registrationNumber !== undefined) updateData.registrationNumber = String(body.registrationNumber).trim();
    if (body.type !== undefined) updateData.type = String(body.type).trim();
    if (body.capacity !== undefined) updateData.capacity = Number(body.capacity);
    if (body.fuelType !== undefined) updateData.fuelType = String(body.fuelType).trim();
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.notes !== undefined) updateData.notes = body.notes ? String(body.notes).trim() : null;

    const updated = await db
      .update(vehicles)
      .set(updateData)
      .where(whereClause)
      .returning()
      .get();

    await logActivity({
      request,
      action: "update",
      resourceType: "vehicle",
      resourceId: id,
      staffId: session.staffId,
      details: updateData,
    });

    return NextResponse.json({ vehicle: updated });
  });
}, "vehicles:manage");

export const DELETE = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 });

  const scopedInstId = await resolveRequestInstitution(session, null);
  const whereClause = scopedInstId && scopedInstId !== "global"
    ? and(eq(vehicles.id, id), eq(vehicles.institutionId, scopedInstId))
    : eq(vehicles.id, id);

  const existing = await db.select().from(vehicles).where(whereClause).get();
  if (!existing) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  return withVehicleLock(id, async () => {
    // Check for active or pending bookings
    const activeBooking = await db
      .select({ id: vehicleBookings.id, status: vehicleBookings.status })
      .from(vehicleBookings)
      .where(
        and(
          eq(vehicleBookings.vehicleId, id),
          or(eq(vehicleBookings.status, "pending"), eq(vehicleBookings.status, "approved"))
        )
      )
      .get();

    if (activeBooking) {
      return NextResponse.json(
        { error: "Cannot delete vehicle with active or pending bookings. Decommission or cancel bookings first." },
        { status: 400 }
      );
    }

    // Disassociate fleet routes so foreign key constraint is satisfied
    await db.update(fleetRoutes).set({ vehicleId: null }).where(eq(fleetRoutes.vehicleId, id)).run();

    // Cascading cleanups
    await db.delete(fleetMaintenanceLogs).where(eq(fleetMaintenanceLogs.vehicleId, id)).run();
    await db.delete(vehicleLogs).where(eq(vehicleLogs.vehicleId, id)).run();
    await db.delete(vehicleBookings).where(eq(vehicleBookings.vehicleId, id)).run();
    await db.delete(vehicles).where(whereClause).run();

    await logActivity({
      request,
      action: "delete",
      resourceType: "vehicle",
      resourceId: id,
      staffId: session.staffId,
      details: { registrationNumber: existing.registrationNumber },
    });

    return NextResponse.json({ success: true });
  });
}, "vehicles:manage");
