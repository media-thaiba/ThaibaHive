import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { HardwareDeviceEngine } from "@/lib/hardware/device-engine";
import { hardwareDeviceUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * GET /api/hardware/devices/[id]
 * Get hardware device details.
 */
export const GET = requireAuth(async (request: Request, session, { params }: any) => {
  const institutionId = await resolveRequestInstitution(session);
  const deviceId = params.id;

  try {
    const device = await HardwareDeviceEngine.getDevice(institutionId, deviceId);
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    return NextResponse.json({ device });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get device" },
      { status: 500 }
    );
  }
}, "hardware:devices:read");

/**
 * PATCH /api/hardware/devices/[id]
 * Update hardware device configuration / status.
 */
export const PATCH = requireAuth(async (request: Request, session, { params }: any) => {
  const institutionId = await resolveRequestInstitution(session);
  const deviceId = params.id;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = hardwareDeviceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const updated = await HardwareDeviceEngine.updateDevice(
      institutionId,
      deviceId,
      parsed.data
    );

    if (!updated) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    return NextResponse.json({ device: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update device" },
      { status: 500 }
    );
  }
}, "hardware:devices:manage");

/**
 * DELETE /api/hardware/devices/[id]
 * Delete a hardware device.
 */
export const DELETE = requireAuth(async (request: Request, session, { params }: any) => {
  const institutionId = await resolveRequestInstitution(session);
  const deviceId = params.id;

  try {
    const deleted = await HardwareDeviceEngine.deleteDevice(institutionId, deviceId);
    if (!deleted) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Device deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete device" },
      { status: 500 }
    );
  }
}, "hardware:devices:manage");
