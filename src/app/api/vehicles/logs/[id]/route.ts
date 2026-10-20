import { NextResponse } from "next/server";
import { db } from "@/db";
import { vehicleLogs, vehicles, staff } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { logActivity } from "@/lib/api/activity-log";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Log ID is required" }, { status: 400 });

  const scopedInstId = await resolveRequestInstitution(session, null);

  const log = await db
    .select({
      id: vehicleLogs.id,
      vehicleId: vehicleLogs.vehicleId,
      date: vehicleLogs.date,
      startOdometer: vehicleLogs.startOdometer,
      endOdometer: vehicleLogs.endOdometer,
      distanceKm: vehicleLogs.distanceKm,
      fuelLitres: vehicleLogs.fuelLitres,
      fuelCost: vehicleLogs.fuelCost,
      route: vehicleLogs.route,
      notes: vehicleLogs.notes,
      driverName: staff.firstName,
      driverLastName: staff.lastName,
      vehicleReg: vehicles.registrationNumber,
      vehicleInstitutionId: vehicles.institutionId,
    })
    .from(vehicleLogs)
    .innerJoin(vehicles, eq(vehicleLogs.vehicleId, vehicles.id))
    .leftJoin(staff, eq(vehicleLogs.driverId, staff.id))
    .where(eq(vehicleLogs.id, id))
    .get();

  if (!log) {
    return NextResponse.json({ error: "Vehicle log not found" }, { status: 404 });
  }

  if (scopedInstId !== "global" && log.vehicleInstitutionId && log.vehicleInstitutionId !== scopedInstId) {
    return NextResponse.json({ error: "Vehicle log not found" }, { status: 404 });
  }

  return NextResponse.json({ log });
}, "vehicles:read");

export const DELETE = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Log ID is required" }, { status: 400 });

  const scopedInstId = await resolveRequestInstitution(session, null);

  const existing = await db
    .select({
      id: vehicleLogs.id,
      vehicleId: vehicleLogs.vehicleId,
      vehicleInstitutionId: vehicles.institutionId,
    })
    .from(vehicleLogs)
    .innerJoin(vehicles, eq(vehicleLogs.vehicleId, vehicles.id))
    .where(eq(vehicleLogs.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Vehicle log not found" }, { status: 404 });
  }

  if (scopedInstId !== "global" && existing.vehicleInstitutionId && existing.vehicleInstitutionId !== scopedInstId) {
    return NextResponse.json({ error: "Vehicle log not found" }, { status: 404 });
  }

  await db.delete(vehicleLogs).where(eq(vehicleLogs.id, id)).run();

  await logActivity({
    request,
    action: "delete",
    resourceType: "vehicle_log",
    resourceId: id,
    staffId: session.staffId,
    details: { vehicleId: existing.vehicleId },
  });

  return NextResponse.json({ success: true, message: "Vehicle log deleted successfully" });
}, "vehicles:manage");
