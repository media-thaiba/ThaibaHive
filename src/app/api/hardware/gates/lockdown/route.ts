import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { gateLockdownSchema } from "@/lib/validation/schemas";
import { GateAccessEngine } from "@/lib/hardware/gate-access-engine";

export const dynamic = "force-dynamic";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const institutionId = await resolveRequestInstitution(session);
    const body = await request.json();

    const parsed = gateLockdownSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid lockdown payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const lockdownState = GateAccessEngine.setLockdown(
      institutionId,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      message: parsed.data.isLocked
        ? "Facility emergency lockdown activated"
        : "Facility lockdown released",
      lockdownState,
    });
  } catch (error: any) {
    console.error("[GateLockdown] Error updating lockdown status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update gate lockdown status" },
      { status: 500 }
    );
  }
}, "hardware:gates:lockdown");
