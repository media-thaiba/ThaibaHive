import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { GeofenceEngine } from "@/lib/hardware/geofence-engine";
import { hardwareZoneUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * GET /api/hardware/zones/[id]
 * Get single zone details.
 */
export const GET = requireAuth(async (request: Request, session, { params }: any) => {
  const institutionId = await resolveRequestInstitution(session);
  const zoneId = params.id;

  try {
    const zone = await GeofenceEngine.getZone(institutionId, zoneId);
    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json({ zone });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get zone" },
      { status: 500 }
    );
  }
}, "hardware:zones:read");

/**
 * PATCH /api/hardware/zones/[id]
 * Update zone properties or boundary coordinates.
 */
export const PATCH = requireAuth(async (request: Request, session, { params }: any) => {
  const institutionId = await resolveRequestInstitution(session);
  const zoneId = params.id;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = hardwareZoneUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const updated = await GeofenceEngine.updateZone(
      institutionId,
      zoneId,
      parsed.data
    );

    if (!updated) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json({ zone: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update zone" },
      { status: 500 }
    );
  }
}, "hardware:zones:manage");

/**
 * DELETE /api/hardware/zones/[id]
 * Delete a zone.
 */
export const DELETE = requireAuth(async (request: Request, session, { params }: any) => {
  const institutionId = await resolveRequestInstitution(session);
  const zoneId = params.id;

  try {
    const deleted = await GeofenceEngine.deleteZone(institutionId, zoneId);
    if (!deleted) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Zone deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete zone" },
      { status: 500 }
    );
  }
}, "hardware:zones:manage");
