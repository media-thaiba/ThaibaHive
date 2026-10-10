import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { HardwareDeviceEngine } from "@/lib/hardware/device-engine";
import { hardwareHeartbeatSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * POST /api/hardware/telemetry/heartbeat
 * Record periodic device heartbeat and update status to online.
 */
export const POST = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = hardwareHeartbeatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const result = await HardwareDeviceEngine.recordHeartbeat(
      institutionId,
      parsed.data
    );

    if (!result) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to record heartbeat" },
      { status: 500 }
    );
  }
}, "hardware:telemetry:read");
