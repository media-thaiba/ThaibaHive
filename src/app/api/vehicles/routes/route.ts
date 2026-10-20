import { NextResponse } from "next/server";
import { db } from "@/db";
import { fleetRoutes, vehicles } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const requestedInst = url.searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);

  let query = db
    .select()
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

  const { name, startLocation, endLocation, stopsJson, driverId, vehicleId } = body;

  if (!name || !startLocation || !endLocation) {
    return NextResponse.json({ error: "Missing required route fields" }, { status: 400 });
  }

  const scopedInstId = await resolveRequestInstitution(session, body.institutionId);

  // If vehicle is specified, verify existence and tenant scoping
  if (vehicleId) {
    const vehicle = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).get();
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    if (scopedInstId !== "global" && vehicle.institutionId && vehicle.institutionId !== scopedInstId) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
  }

  const targetInstId = scopedInstId !== "global" ? scopedInstId : null;
  if (!targetInstId) {
    return NextResponse.json(
      { error: "A valid institution context is required to create a fleet route" },
      { status: 400 }
    );
  }

  const route = await db
    .insert(fleetRoutes)
    .values({
      id: crypto.randomUUID(),
      institutionId: targetInstId,
      name: String(name).trim(),
      startLocation: String(startLocation).trim(),
      endLocation: String(endLocation).trim(),
      stopsJson: stopsJson ? JSON.stringify(stopsJson) : null,
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
    details: { name, vehicleId, startLocation, endLocation },
  });

  return NextResponse.json({ route }, { status: 201 });
}, "vehicles:manage");
