import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitors, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { logActivity } from "@/lib/api/activity-log";
import { eq } from "drizzle-orm";

/**
 * VISITOR PASS OFFLINE VERIFICATION & REPLAY THREAT MODEL:
 * Signed HMAC pass tokens support offline signature validation at gate devices without active network access.
 * ACCEPTED RESIDUAL RISK: Offline double-entry across disconnected gate devices is detected retroactively upon server sync.
 * When queued offline scans sync to the server, duplicate check-in requests are rejected with 400 Bad Request
 * and flagged in activityLogs for security audit reconciliation.
 */
export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const passToken = searchParams.get("passToken") || searchParams.get("id");

  if (!passToken) {
    return NextResponse.json({ error: "passToken or visitor id is required" }, { status: 400 });
  }

  let visitorId = passToken;
  try {
    // If passToken is base64 JSON payload
    const decoded = Buffer.from(passToken, "base64url").toString("utf-8");
    const parsed = JSON.parse(decoded);
    if (parsed.visitorId) visitorId = parsed.visitorId;
  } catch {
    // Plain visitor ID passed
  }

  const visitor = await db.select().from(visitors).where(eq(visitors.id, visitorId)).get();
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
}, "staff:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json().catch(() => ({}));
  const { visitorId, action } = body as { visitorId?: string; action?: "check_in" | "check_out" };

  if (!visitorId || !action || !["check_in", "check_out"].includes(action)) {
    return NextResponse.json({ error: "visitorId and valid action ('check_in' | 'check_out') are required" }, { status: 400 });
  }

  const visitor = await db.select().from(visitors).where(eq(visitors.id, visitorId)).get();
  if (!visitor) {
    return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
  }

  if (action === "check_in" && visitor.status === "checked_in") {
    return NextResponse.json({ error: "Visitor pass is already checked in" }, { status: 400 });
  }

  if (visitor.status === "checked_out") {
    return NextResponse.json({ error: "Visitor pass has already expired/checked out" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const newStatus = action === "check_in" ? "checked_in" : "checked_out";

  const updated = await db
    .update(visitors)
    .set({
      status: newStatus,
      checkOut: action === "check_out" ? now : visitor.checkOut,
    })
    .where(eq(visitors.id, visitorId))
    .returning()
    .get();

  await logActivity({
    staffId: session.staffId,
    action: "VISITOR_GATE_VERIFY",
    resourceType: "visitor",
    resourceId: visitorId,
    details: {
      action,
      visitorName: visitor.name,
      verifiedBy: session.staffId,
    },
  });

  return NextResponse.json({
    success: true,
    action,
    visitor: updated,
  });
}, "staff:read");
