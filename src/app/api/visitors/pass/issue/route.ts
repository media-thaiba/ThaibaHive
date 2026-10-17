import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitorPasses, visitorRequests } from "@/db/schema";
import { requireAuth, resolveInstitutionContext } from "@/lib/api/auth-guard";
import { VisitorQrPassService } from "@/lib/visitors/qr-pass-service";
import { validateHostStaff } from "@/lib/visitors/host-validation";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { requestId, visitorName, visitorPhone, hostStaffId, purpose, validFrom, validUntil } = body;

  if (!visitorName || !hostStaffId || !validFrom || !validUntil) {
    return NextResponse.json({ error: "Missing required visitor pass parameters" }, { status: 400 });
  }

  const fromMs = Date.parse(validFrom);
  const untilMs = Date.parse(validUntil);
  if (Number.isNaN(fromMs) || Number.isNaN(untilMs)) {
    return NextResponse.json({ error: "validFrom and validUntil must be valid datetimes" }, { status: 400 });
  }
  if (untilMs <= fromMs) {
    return NextResponse.json({ error: "validUntil must be after validFrom" }, { status: 400 });
  }
  if (untilMs <= Date.now()) {
    return NextResponse.json({ error: "Visitor pass validity window must end in the future" }, { status: 400 });
  }

  // Admin sessions resolve to the virtual "global" scope, so fall back to the
  // actor's first verified membership — otherwise the NOT NULL FK on
  // visitor_passes.institution_id rejects the insert (500) for admins/front desk.
  const instId = await resolveInstitutionContext(session, body.institutionId || null);
  if (!instId) {
    return NextResponse.json(
      { error: "Unable to resolve institution scope for pass issuance" },
      { status: 400 }
    );
  }

  // Host must be an active staff member inside the issuing institution scope
  const hostCheck = await validateHostStaff(hostStaffId, instId);
  if (!hostCheck.ok) {
    return NextResponse.json({ error: hostCheck.error }, { status: hostCheck.status });
  }

  // A pass can only be issued against an approved, in-scope pre-registration request
  if (requestId) {
    const requestWhere = instId && instId !== "global"
      ? and(eq(visitorRequests.id, requestId), eq(visitorRequests.institutionId, instId))
      : eq(visitorRequests.id, requestId);
    const requestRecord = await db
      .select({ id: visitorRequests.id, status: visitorRequests.status })
      .from(visitorRequests)
      .where(requestWhere)
      .get();
    if (!requestRecord) {
      return NextResponse.json({ error: "Pre-registration request not found" }, { status: 404 });
    }
    if (requestRecord.status !== "approved") {
      return NextResponse.json(
        { error: `Pre-registration request is '${requestRecord.status}' — only approved requests can receive a pass` },
        { status: 409 }
      );
    }
  }

  const passId = crypto.randomUUID();

  const { qrPayload, signature } = VisitorQrPassService.issuePassPayload({
    institutionId: instId,
    visitorId: passId,
    hostId: hostStaffId,
    validFrom,
    validUntil,
  });

  const pass = await db
    .insert(visitorPasses)
    .values({
      id: passId,
      institutionId: instId,
      requestId: requestId || null,
      visitorName,
      visitorPhone: visitorPhone || "",
      hostStaffId,
      purpose: purpose || "Campus Visit",
      qrSignature: signature,
      validFrom,
      validUntil,
      status: "approved",
      gatekeeperId: session.staffId,
    })
    .returning()
    .get();

  return NextResponse.json({ pass, qrPayload }, { status: 201 });
}, "visitor:issue");
