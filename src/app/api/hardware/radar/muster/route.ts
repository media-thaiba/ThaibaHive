import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { MusterEngine } from "@/lib/hardware/muster-engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/hardware/radar/muster
 * Retrieve real-time emergency muster headcount and missing occupants list.
 */
export const GET = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  try {
    const report = await MusterEngine.calculateMusterHeadcount(institutionId);
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to calculate muster report" },
      { status: 500 }
    );
  }
}, "hardware:radar:view");
