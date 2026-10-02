import { NextResponse } from "next/server";
import { db } from "@/db";
import { fleetRoutes } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@thaiba/auth";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (request: Request) => {
  const url = new URL(request.url);
  const instId = await resolveScopedInstitutionId(url.searchParams.get("institutionId"));
  const routes = await db
    .select()
    .from(fleetRoutes)
    .where(instId && instId !== "global" ? eq(fleetRoutes.institutionId, instId) : undefined)
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

  const instId = await resolveScopedInstitutionId(body.institutionId);

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
