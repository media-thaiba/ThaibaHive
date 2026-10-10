import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { TrilaterationEngine } from "@/lib/hardware/trilateration-engine";
import { GeofenceEngine } from "@/lib/hardware/geofence-engine";
import { trilaterationCalculateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * POST /api/hardware/radar/locate
 * Calculate estimated position from multi-anchor RSSI observations and resolve active zone.
 */
export const POST = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = trilaterationCalculateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const position = TrilaterationEngine.calculatePosition(parsed.data.observations);

    const resolvedZone = await GeofenceEngine.resolveZoneForCoordinates(
      institutionId,
      position.coordinates
    );

    return NextResponse.json({
      position,
      resolvedZone: resolvedZone
        ? {
            id: resolvedZone.id,
            name: resolvedZone.name,
            type: resolvedZone.type,
            floorNumber: resolvedZone.floorNumber,
            isMusterPoint: resolvedZone.isMusterPoint,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to calculate position" },
      { status: 500 }
    );
  }
}, "hardware:radar:view");
