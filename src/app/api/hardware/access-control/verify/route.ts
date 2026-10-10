import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { gateAccessVerifySchema } from "@/lib/validation/schemas";
import { GateAccessEngine } from "@/lib/hardware/gate-access-engine";
import { AntiPassbackMode } from "@/lib/hardware/anti-passback-engine";

export const dynamic = "force-dynamic";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const institutionId = await resolveRequestInstitution(session);
    const body = await request.json();

    const parsed = gateAccessVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid verification payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const apbMode = (searchParams.get("apbMode") || "hard") as AntiPassbackMode;

    const decision = await GateAccessEngine.verifyAccess(
      institutionId,
      parsed.data,
      apbMode
    );

    const status = decision.granted ? 200 : 403;
    return NextResponse.json(decision, { status });
  } catch (error: any) {
    console.error("[GateAccess] Error verifying access:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process access verification" },
      { status: 500 }
    );
  }
}, "hardware:access:manage");
