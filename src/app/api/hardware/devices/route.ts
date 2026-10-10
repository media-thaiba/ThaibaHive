import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { HardwareDeviceEngine } from "@/lib/hardware/device-engine";
import { hardwareDeviceRegisterSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * GET /api/hardware/devices
 * List hardware devices for the scoped institution with optional filters.
 */
export const GET = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type") || undefined;
  const status = searchParams.get("status") || undefined;
  const zoneId = searchParams.get("zoneId") || undefined;
  const isActive = searchParams.has("isActive")
    ? searchParams.get("isActive") === "true"
    : undefined;

  try {
    const devices = await HardwareDeviceEngine.listDevices(institutionId, {
      type,
      status,
      zoneId,
      isActive,
    });

    const anomalies = await HardwareDeviceEngine.detectAnomalies(institutionId);

    return NextResponse.json({
      devices,
      total: devices.length,
      anomalies,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list hardware devices" },
      { status: 500 }
    );
  }
}, "hardware:devices:read");

/**
 * POST /api/hardware/devices
 * Register a new hardware device.
 */
export const POST = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = hardwareDeviceRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const device = await HardwareDeviceEngine.registerDevice(
      institutionId,
      parsed.data
    );

    return NextResponse.json({ device }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to register hardware device" },
      { status: 500 }
    );
  }
}, "hardware:devices:manage");
