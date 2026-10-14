import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { AllocationEngine } from "@/lib/cross-campus/allocation-engine";
import { isSisSyncEnabled } from "@/lib/features";
import { crossCampusBookingDecisionSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cross-campus/requests/[id]/decline
 * Declines a cross-campus booking request.
 */
export const POST = requireAuth(async (request: Request, session: any, context?: any) => {
  let body: any = {};
  try {
    const text = await request.text();
    if (text && text.trim().length > 0) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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

  const params = await context?.params;
  const bookingId = params?.id;
  if (!bookingId) {
    return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
  }

  const parsed = crossCampusBookingDecisionSchema.safeParse(body);
  const reason = parsed.success ? parsed.data.decisionReason || undefined : undefined;

  try {
    const booking = await AllocationEngine.declineBooking(
      institutionId,
      bookingId,
      session.staffId || session.userId,
      reason
    );
    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    const msg = err.message || "Failed to decline booking";
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}, "crosscampus:approve");
