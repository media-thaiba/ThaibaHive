import { NextResponse } from "next/server";
import { db } from "@/db";
import { fleetRoutes, vehicles, staff, staffInstitutions } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { fleetRouteCreateSchema } from "@/lib/validation/schemas";
import { eq, and, desc } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const requestedInst = url.searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);

  let query = db
    .select({
      id: fleetRoutes.id,
      institutionId: fleetRoutes.institutionId,
      name: fleetRoutes.name,
      startLocation: fleetRoutes.startLocation,
      endLocation: fleetRoutes.endLocation,
      stopsJson: fleetRoutes.stopsJson,
      driverId: fleetRoutes.driverId,
      vehicleId: fleetRoutes.vehicleId,
      isActive: fleetRoutes.isActive,
      createdAt: fleetRoutes.createdAt,
    })
    .from(fleetRoutes)
    .$dynamic();

  if (scopedInstId !== "global") {
    query = query.where(eq(fleetRoutes.institutionId, scopedInstId));
  }

  const routes = await query.orderBy(desc(fleetRoutes.createdAt)).all();

  return NextResponse.json({ routes });
}, "vehicles:read");

export const POST = requireAuth(async (request: Request, session) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`vehicles:routes:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = fleetRouteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid route parameters", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { name, startLocation, endLocation, stopsJson, driverId, vehicleId } = parsed.data;
  const scopedInstId = await resolveRequestInstitution(session, parsed.data.institutionId);

  const targetInstId = scopedInstId !== "global" ? scopedInstId : null;
  if (!targetInstId) {
    return NextResponse.json(
      { error: "A valid institution context is required to create a fleet route" },
      { status: 400 }
    );
  }

  // If vehicle is specified, verify existence and tenant scoping
  if (vehicleId) {
    const vehicle = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).get();
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    if (vehicle.institutionId && vehicle.institutionId !== targetInstId) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
  }

  // If driver is specified, verify existence and tenant scoping
  if (driverId) {
    const driver = await db.select({ id: staff.id }).from(staff).where(eq(staff.id, driverId)).get();
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    if (targetInstId) {
      const mapping = await db
        .select({ staffId: staffInstitutions.staffId })
        .from(staffInstitutions)
        .where(
          and(
            eq(staffInstitutions.staffId, driverId),
            eq(staffInstitutions.institutionId, targetInstId)
          )
        )
        .get();

      if (!mapping && session.role !== "super_admin") {
        return NextResponse.json(
          { error: "Assigned driver does not belong to this institution" },
          { status: 400 }
        );
      }
    }
  }

  const route = await db
    .insert(fleetRoutes)
    .values({
      id: crypto.randomUUID(),
      institutionId: targetInstId,
      name,
      startLocation,
      endLocation,
      stopsJson: stopsJson ? (typeof stopsJson === "string" ? stopsJson : JSON.stringify(stopsJson)) : null,
      driverId: driverId || null,
      vehicleId: vehicleId || null,
      isActive: true,
    })
    .returning()
    .get();

  await logActivity({
    request,
    action: "create",
    resourceType: "fleet_route",
    resourceId: route.id,
    staffId: session.staffId,
    details: { name, vehicleId, driverId, startLocation, endLocation },
  });

  return NextResponse.json({ route }, { status: 201 });
}, "vehicles:manage");
