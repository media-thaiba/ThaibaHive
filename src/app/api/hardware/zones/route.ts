import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { GeofenceEngine } from "@/lib/hardware/geofence-engine";
import { hardwareZoneSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * GET /api/hardware/zones
 * List all campus zones with optional floor and type filters.
 */
export const GET = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type") || undefined;
  const floorNumber = searchParams.has("floorNumber")
    ? parseInt(searchParams.get("floorNumber")!, 10)
    : undefined;
  const isMusterPoint = searchParams.has("isMusterPoint")
    ? searchParams.get("isMusterPoint") === "true"
    : undefined;
  const isActive = searchParams.has("isActive")
    ? searchParams.get("isActive") === "true"
    : undefined;

  try {
    const zones = await GeofenceEngine.listZones(institutionId, {
      type,
      floorNumber,
      isMusterPoint,
      isActive,
    });

    return NextResponse.json({
      zones,
      total: zones.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list zones" },
      { status: 500 }
    );
  }
}, "hardware:zones:read");

/**
 * POST /api/hardware/zones
 * Create a new campus zone with geofence boundaries.
 */
export const POST = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = hardwareZoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const zone = await GeofenceEngine.createZone(institutionId, parsed.data);
    return NextResponse.json({ zone }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create zone" },
      { status: 500 }
    );
  }
}, "hardware:zones:manage");
