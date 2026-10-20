import { NextResponse } from "next/server";
import { db } from "@/db";
import { vehicleLogs, vehicles, staff } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { vehicleLogCreateSchema } from "@/lib/validation/schemas";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const vehicleId = url.searchParams.get("vehicleId");
  const requestedInst = url.searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);

  let query = db
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
    .$dynamic();

  if (scopedInstId !== "global") {
    query = query.where(eq(vehicles.institutionId, scopedInstId));
  }

  if (vehicleId) {
    query = query.where(eq(vehicleLogs.vehicleId, vehicleId));
  }

  const logs = await query.orderBy(desc(vehicleLogs.date), desc(vehicleLogs.createdAt)).all();

  return NextResponse.json({ logs });
}, "vehicles:read");

export const POST = requireAuth(async (request: Request, session) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`vehicles:logs:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = vehicleLogCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid vehicle log parameters", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { vehicleId, date, startOdometer, endOdometer, distanceKm, fuelLitres, fuelCost, route, notes } = parsed.data;

  // Driver profile validation
  if (!session.staffId) {
    return NextResponse.json(
      { error: "A valid staff profile is required to log vehicle operations" },
      { status: 400 }
    );
  }

  // Tenant scoping & vehicle check
  const scopedInstId = await resolveRequestInstitution(session, null);
  const vehicle = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).get();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  if (scopedInstId !== "global" && vehicle.institutionId && vehicle.institutionId !== scopedInstId) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const computedDistance = distanceKm ?? (
    startOdometer !== undefined && startOdometer !== null && endOdometer !== undefined && endOdometer !== null
      ? endOdometer - startOdometer
      : null
  );

  const log = await db
    .insert(vehicleLogs)
    .values({
      id: crypto.randomUUID(),
      vehicleId,
      driverId: session.staffId,
      date,
      startOdometer: startOdometer ?? null,
      endOdometer: endOdometer ?? null,
      distanceKm: computedDistance,
      fuelLitres: fuelLitres ?? null,
      fuelCost: fuelCost ?? null,
      route: route ?? null,
      notes: notes ?? null,
    })
    .returning()
    .get();

  await logActivity({
    request,
    action: "create",
    resourceType: "vehicle_log",
    resourceId: log.id,
    staffId: session.staffId,
    details: { vehicleId, date, distanceKm: computedDistance },
  });

  return NextResponse.json({ log }, { status: 201 });
}, "vehicles:create");
