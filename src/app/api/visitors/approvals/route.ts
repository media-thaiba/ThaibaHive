import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitorRequests, activityLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { visitorApprovalSchema } from "@/lib/validation/schemas";
import { withVisitorRequestLock, isTerminalVisitorRequestStatus } from "@/lib/visitors/ledger";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(`visitor-approval:${session.staffId}`, { windowMs: 60_000, max: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = visitorApprovalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid approval parameters" },
      { status: 400 }
    );
  }

  const { requestId, status, rejectionReason } = parsed.data;

  return await withVisitorRequestLock(requestId, async () => {
    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
    const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
      ? and(eq(visitorRequests.id, requestId), eq(visitorRequests.institutionId, scopedInstitutionId))
      : eq(visitorRequests.id, requestId);

    const existing = await db
      .select()
      .from(visitorRequests)
      .where(whereClause)
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Visitor pre-registration request not found" }, { status: 404 });
    }

    // State machine guard: only pending requests can be transitioned
    if (isTerminalVisitorRequestStatus(existing.status)) {
      return NextResponse.json(
        { error: `Cannot change status of a request in terminal state '${existing.status}'` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const updated = await db
      .update(visitorRequests)
      .set({
        status,
        rejectionReason: rejectionReason || null,
        updatedAt: now,
      })
      .where(and(whereClause, eq(visitorRequests.status, "pending")))
      .returning()
      .get();

    if (!updated) {
      return NextResponse.json(
        { error: "Request status was modified by another concurrent action" },
        { status: 409 }
      );
    }

    try {
      await db.insert(activityLogs).values({
        staffId: session.staffId,
        action: `visitor_request_${status}`,
        resourceType: "visitor_request",
        resourceId: requestId,
        details: JSON.stringify({
          requestId,
          previousStatus: existing.status,
          newStatus: status,
          updatedBy: session.staffId,
        }),
      });
    } catch (err) {
      console.warn("[VisitorApproval] Activity log failed:", err);
    }

    return NextResponse.json({ request: updated });
  });
}, "visitor:issue");
