import { NextResponse } from "next/server";
import { db } from "@/db";
import { fleetRoutes } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const instId = "inst_001";
  const routes = await db
    .select()
    .from(fleetRoutes)
    .where(eq(fleetRoutes.institutionId, instId))
    .orderBy(desc(fleetRoutes.createdAt))
    .all();

  return NextResponse.json({ routes });
}, "vehicles:read");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { name, startLocation, endLocation, stopsJson, driverId, vehicleId } = body;

  if (!name || !startLocation || !endLocation) {
    return NextResponse.json({ error: "Missing required route fields" }, { status: 400 });
  }

  const instId = "inst_001";

  const route = await db
    .insert(fleetRoutes)
    .values({
      id: crypto.randomUUID(),
      institutionId: instId,
      name,
      startLocation,
      endLocation,
      stopsJson: stopsJson ? JSON.stringify(stopsJson) : null,
      driverId: driverId || null,
      vehicleId: vehicleId || null,
      isActive: true,
    })
    .returning()
    .get();

  return NextResponse.json({ route }, { status: 201 });
}, "vehicles:manage");
