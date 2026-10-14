import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { AllocationEngine } from "@/lib/cross-campus/allocation-engine";
import { isSisSyncEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cross-campus/availability
 * Checks resource pool availability for a specified time interval.
 */
export const GET = requireAuth(async (request: Request, session: any) => {
  const { searchParams } = new URL(request.url);
  const requestedInst =
    searchParams.get("institutionId") ||
    request.headers.get("x-institution-id") ||
    (session.institutionId && session.institutionId !== "global" ? session.institutionId : undefined);
  const institutionId = await resolveRequestInstitution(session, requestedInst);

  if (!institutionId || institutionId === "global") {
    return NextResponse.json({ error: "Institution context required" }, { status: 400 });
  }

  if (!isSisSyncEnabled(institutionId)) {
    return NextResponse.json({ error: "Federation sync feature is disabled" }, { status: 403 });
  }

  const poolId = searchParams.get("poolId");
  const startsAt = searchParams.get("startsAt");
  const endsAt = searchParams.get("endsAt");

  if (!poolId || !startsAt || !endsAt) {
    return NextResponse.json(
      { error: "poolId, startsAt, and endsAt query parameters are required" },
      { status: 400 }
    );
  }

  try {
    const result = await AllocationEngine.checkAvailability(poolId, startsAt, endsAt);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to check availability" },
      { status: 500 }
    );
  }
}, "crosscampus:read");
