import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { AllocationEngine } from "@/lib/cross-campus/allocation-engine";
import { isSisSyncEnabled } from "@/lib/features";
import { crossCampusBookingRequestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cross-campus/requests
 * Lists cross-campus booking requests.
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

  const poolId = searchParams.get("poolId") || undefined;
  const status = searchParams.get("status") || undefined;

  try {
    const requests = await AllocationEngine.listBookings({
      poolId,
      status,
      requesterInstitutionId: session.role === "admin" ? undefined : institutionId,
    });
    return NextResponse.json({ requests });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list requests" }, { status: 500 });
  }
}, "crosscampus:read");

/**
 * POST /api/cross-campus/requests
 * Submits a cross-campus booking request for a shared resource pool.
 */
export const POST = requireAuth(async (request: Request, session: any) => {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const requestedInst =
    body.requesterInstitutionId ||
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

  const parsed = crossCampusBookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const booking = await AllocationEngine.requestBooking(
      institutionId,
      session.staffId || session.userId,
      parsed.data
    );
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to request booking" }, { status: 500 });
  }
}, "crosscampus:request");
