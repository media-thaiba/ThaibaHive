import { NextResponse } from "next/server";
import { db } from "@/db";
import { fleetMaintenanceLogs, vehicles } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@thaiba/auth";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const instId = await resolveScopedInstitutionId(url.searchParams.get("institutionId"));
  const logs = await db
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
      createdAt: fleetMaintenanceLogs.createdAt,
    })
    .from(fleetMaintenanceLogs)
    .leftJoin(vehicles, eq(fleetMaintenanceLogs.vehicleId, vehicles.id))
    .where(instId && instId !== "global" ? eq(fleetMaintenanceLogs.institutionId, instId) : undefined)
    .orderBy(desc(fleetMaintenanceLogs.createdAt))
    .all();

  return NextResponse.json({ maintenanceLogs: logs });
}, "vehicles:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { vehicleId, maintenanceDate, serviceType, cost, odometerReading, description, performedBy } = body;

  if (!vehicleId || !maintenanceDate || !serviceType) {
    return NextResponse.json({ error: "Missing required maintenance parameters" }, { status: 400 });
  }

  const instId = await resolveScopedInstitutionId(body.institutionId);

  const log = await db
    .insert(fleetMaintenanceLogs)
    .values({
      id: crypto.randomUUID(),
      institutionId: instId,
      vehicleId,
      maintenanceDate,
      serviceType,
      cost: cost || 0.0,
      odometerReading: odometerReading || null,
      description: description || null,
      performedBy: performedBy || session.staffId,
      status: "completed",
    })
    .returning()
    .get();

  return NextResponse.json({ maintenanceLog: log }, { status: 201 });
}, "vehicles:manage");
