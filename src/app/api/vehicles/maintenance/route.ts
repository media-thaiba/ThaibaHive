import { NextResponse } from "next/server";
import { db } from "@/db";
import { fleetMaintenanceLogs, vehicles } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { fleetMaintenanceCreateSchema } from "@/lib/validation/schemas";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const requestedInst = url.searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);

  let query = db
    .select({
      id: fleetMaintenanceLogs.id,
      vehicleId: fleetMaintenanceLogs.vehicleId,
      registrationNumber: vehicles.registrationNumber,
      model: vehicles.model,
      maintenanceDate: fleetMaintenanceLogs.maintenanceDate,
      serviceType: fleetMaintenanceLogs.serviceType,
      cost: fleetMaintenanceLogs.cost,
      odometerReading: fleetMaintenanceLogs.odometerReading,
      description: fleetMaintenanceLogs.description,
      performedBy: fleetMaintenanceLogs.performedBy,
      status: fleetMaintenanceLogs.status,
      institutionId: fleetMaintenanceLogs.institutionId,
      createdAt: fleetMaintenanceLogs.createdAt,
    })
    .from(fleetMaintenanceLogs)
    .innerJoin(vehicles, eq(fleetMaintenanceLogs.vehicleId, vehicles.id))
    .$dynamic();

  if (scopedInstId !== "global") {
    query = query.where(eq(fleetMaintenanceLogs.institutionId, scopedInstId));
  }

  const logs = await query.orderBy(desc(fleetMaintenanceLogs.createdAt)).all();

  return NextResponse.json({ maintenanceLogs: logs });
}, "vehicles:read");

export const POST = requireAuth(async (request: Request, session) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`vehicles:maintenance:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = fleetMaintenanceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid maintenance parameters", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { vehicleId, maintenanceDate, serviceType, cost, odometerReading, description, performedBy } = parsed.data;

  // Tenant scoping & vehicle check
  const scopedInstId = await resolveRequestInstitution(session, null);
  const vehicle = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).get();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  if (scopedInstId !== "global" && vehicle.institutionId && vehicle.institutionId !== scopedInstId) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  // Determine valid institution ID (foreign key to institutions table)
  const targetInstId = vehicle.institutionId || (scopedInstId !== "global" ? scopedInstId : null);
  if (!targetInstId) {
    return NextResponse.json(
      { error: "Vehicle must belong to a valid institution to log maintenance" },
      { status: 400 }
    );
  }

  const log = await db
    .insert(fleetMaintenanceLogs)
    .values({
      id: crypto.randomUUID(),
      institutionId: targetInstId,
      vehicleId,
      maintenanceDate,
      serviceType,
      cost: cost ?? 0.0,
      odometerReading: odometerReading ?? null,
      description: description ?? null,
      performedBy: performedBy || session.staffId || null,
      status: "completed",
    })
    .returning()
    .get();

  await logActivity({
    request,
    action: "create",
    resourceType: "fleet_maintenance",
    resourceId: log.id,
    staffId: session.staffId,
    details: { vehicleId, serviceType, cost },
  });

  return NextResponse.json({ maintenanceLog: log }, { status: 201 });
}, "vehicles:manage");
