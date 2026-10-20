import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitorPasses, visitorRequests, activityLogs } from "@/db/schema";
import { requireAuth, resolveInstitutionContext } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { visitorPassIssueSchema } from "@/lib/validation/schemas";
import { VisitorQrPassService } from "@/lib/visitors/qr-pass-service";
import { validateHostStaff } from "@/lib/visitors/host-validation";
import { withVisitorRequestLock } from "@/lib/visitors/ledger";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(`visitor-pass-issue:${session.staffId}`, { windowMs: 60_000, max: 30 });
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = visitorPassIssueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid visitor pass parameters" },
      { status: 400 }
    );
  }

  const { requestId, visitorName, visitorPhone, hostStaffId, purpose, validFrom, validUntil } = parsed.data;

  const untilMs = Date.parse(validUntil);
  if (untilMs <= Date.now()) {
    return NextResponse.json({ error: "Visitor pass validity window must end in the future" }, { status: 400 });
  }

  // Admin sessions resolve to the virtual "global" scope, so fall back to the
  // actor's first verified membership — otherwise the NOT NULL FK on
  // visitor_passes.institution_id rejects the insert (500) for admins/front desk.
  const instId = await resolveInstitutionContext(session, parsed.data.institutionId || null);
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

  const issueAction = async () => {
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
        return { error: "Pre-registration request not found", status: 404 };
      }
      if (requestRecord.status !== "approved") {
        return {
          error: `Pre-registration request is '${requestRecord.status}' — only approved requests can receive a pass`,
          status: 409,
        };
      }

      // Concurrency / Duplicate check: pass already issued for this pre-registration request
      const existingPass = await db
        .select({ id: visitorPasses.id })
        .from(visitorPasses)
        .where(eq(visitorPasses.requestId, requestId))
        .get();

      if (existingPass) {
        return {
          error: "A visitor pass has already been issued for this pre-registration request",
          status: 409,
        };
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

    try {
      await db.insert(activityLogs).values({
        staffId: session.staffId,
        action: "visitor_pass_issued",
        resourceType: "visitor_pass",
        resourceId: passId,
        details: JSON.stringify({
          passId,
          requestId: requestId || null,
          visitorName,
          institutionId: instId,
          validUntil,
          issuedBy: session.staffId,
        }),
      });
    } catch (err) {
      console.warn("[PassIssue] Activity log failed:", err);
    }

    return { pass, qrPayload, status: 201 };
  };

  const outcome = requestId
    ? await withVisitorRequestLock(requestId, issueAction)
    : await issueAction();

  if (outcome.error) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json({ pass: outcome.pass, qrPayload: outcome.qrPayload }, { status: 201 });
}, "visitor:issue");
