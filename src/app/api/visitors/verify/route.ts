import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitors, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { visitorVerifyActionSchema } from "@/lib/validation/schemas";
import { withVisitorLock, recordGateLog } from "@/lib/visitors/ledger";
import { VisitorQrPassService } from "@/lib/visitors/qr-pass-service";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const passToken = searchParams.get("passToken") || searchParams.get("id") || searchParams.get("qrPayload");

  if (!passToken) {
    return NextResponse.json({ error: "passToken or visitor id is required" }, { status: 400 });
  }

  if (passToken.startsWith("VIS|")) {
    const verification = VisitorQrPassService.verifyPassPayload(passToken);
    if (!verification.valid) {
      return NextResponse.json({ error: verification.reason || "Invalid QR pass" }, { status: 400 });
    }
    return NextResponse.json({
      valid: true,
      status: "APPROVED",
      payload: verification.payload,
      verifiedAt: new Date().toISOString(),
    });
  }

  let visitorId = passToken;
  try {
    const decoded = Buffer.from(passToken, "base64url").toString("utf-8");
    const parsed = JSON.parse(decoded);
    if (parsed.visitorId) visitorId = parsed.visitorId;
  } catch {
    // Plain visitor ID passed
  }

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
    ? and(eq(visitors.id, visitorId), eq(visitors.institutionId, scopedInstitutionId))
    : eq(visitors.id, visitorId);

  const visitor = await db.select().from(visitors).where(whereClause).get();
  if (!visitor) {
    return NextResponse.json({ error: "Visitor pass not found" }, { status: 404 });
  }

  let hostName = "N/A";
  if (visitor.hostStaffId) {
    const host = await db.select().from(staff).where(eq(staff.id, visitor.hostStaffId)).get();
    if (host) hostName = `${host.firstName} ${host.lastName}`;
  }

  const now = new Date().toISOString();
  let verificationStatus: "approved" | "checked_in" | "expired" | "pending" = "approved";

  if (visitor.status === "checked_out") {
    verificationStatus = "expired";
  } else if (visitor.status === "checked_in") {
    verificationStatus = "checked_in";
  }

  return NextResponse.json({
    visitor: {
      id: visitor.id,
      name: visitor.name,
      contact: visitor.contact,
      purpose: visitor.purpose,
      hostName,
      checkIn: visitor.checkIn,
      checkOut: visitor.checkOut,
      status: visitor.status,
    },
    verificationStatus,
    verifiedAt: now,
  });
}, "visitor:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(`visitor-verify:${session.staffId}`, { windowMs: 60_000, max: 120 });
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = visitorVerifyActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid verify action parameters" },
      { status: 400 }
    );
  }

  const { visitorId, action, deviceId, notes } = parsed.data;

  return await withVisitorLock(visitorId, async () => {
    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
    const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
      ? and(eq(visitors.id, visitorId), eq(visitors.institutionId, scopedInstitutionId))
      : eq(visitors.id, visitorId);

    const visitor = await db.select().from(visitors).where(whereClause).get();
    if (!visitor) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
    }

    if (action === "check_in" && visitor.status === "checked_in") {
      return NextResponse.json({ error: "Visitor pass is already checked in" }, { status: 400 });
    }

    if (visitor.status === "checked_out") {
      return NextResponse.json({ error: "Visitor pass has already expired/checked out" }, { status: 400 });
    }

    if (action === "check_out" && visitor.status !== "checked_in") {
      return NextResponse.json({ error: "Visitor has not checked in yet" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newStatus = action === "check_in" ? "checked_in" : "checked_out";

    // Optimistic concurrency control: ensure existing.status hasn't transitioned concurrently
    const updated = await db
      .update(visitors)
      .set({
        status: newStatus,
        checkIn: action === "check_in" && !visitor.checkIn ? now : visitor.checkIn,
        checkOut: action === "check_out" ? now : visitor.checkOut,
      })
      .where(and(whereClause, eq(visitors.status, visitor.status)))
      .returning()
      .get();

    if (!updated) {
      return NextResponse.json(
        { error: "Visitor status was modified by another concurrent scan" },
        { status: 409 }
      );
    }

    // Physical Gate Log Entry
    await recordGateLog({
      institutionId: visitor.institutionId,
      visitorName: visitor.name,
      actionType: action,
      gatekeeperId: session.staffId,
      deviceId: deviceId || undefined,
      notes: notes || `QR Gate Verification: ${action}`,
    });

    await logActivity({
      staffId: session.staffId,
      action: "VISITOR_GATE_VERIFY",
      resourceType: "visitor",
      resourceId: visitorId,
      details: {
        action,
        visitorName: visitor.name,
        verifiedBy: session.staffId,
        deviceId: deviceId || null,
      },
    });

    return NextResponse.json({
      success: true,
      action,
      visitor: updated,
    });
  });
}, "visitor:verify");
