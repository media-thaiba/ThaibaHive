import { NextResponse } from "next/server";
import { db } from "@/db";
import { grievances, staff, activityLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { withGrievanceLock, isTerminalGrievanceStatus, canAccessGrievance } from "@/lib/grievances/ledger";
import { grievanceUpdateSchema } from "@/lib/validation/schemas";
import { eq, and, inArray } from "drizzle-orm";

export const GET = requireAuth(async (_request: Request, session, context) => {
  const { id } = await context!.params;
  let scopedInstitutionId: string | null = null;
  try {
    scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  } catch {
    scopedInstitutionId = session.institutionId || null;
  }

  const row = await db
    .select({
      id: grievances.id,
      staffId: grievances.staffId,
      isAnonymous: grievances.isAnonymous,
      category: grievances.category,
      subject: grievances.subject,
      description: grievances.description,
      status: grievances.status,
      response: grievances.response,
      respondedById: grievances.respondedById,
      responderName: staff.firstName,
      responderLastName: staff.lastName,
      respondedAt: grievances.respondedAt,
      createdAt: grievances.createdAt,
      updatedAt: grievances.updatedAt,
    })
    .from(grievances)
    .leftJoin(staff, eq(grievances.respondedById, staff.id))
    .where(eq(grievances.id, id))
    .get();

  if (!row) {
    return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
  }

  // ── IDOR & Confidentiality Authorization Gate ─────────────────────────
  const hasAccess = await canAccessGrievance(
    session.staffId,
    session.role,
    scopedInstitutionId,
    row.staffId,
    row.isAnonymous
  );

  if (!hasAccess) {
    // Fail-closed 404 prevents enumeration and confirms zero existence
    return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
  }

  // Whistleblower Anonymity Preservation: Mask staffId to null if anonymous
  let submitterName: string | null = null;
  if (!row.isAnonymous && row.staffId) {
    const submitter = await db
      .select({ firstName: staff.firstName, lastName: staff.lastName })
      .from(staff)
      .where(eq(staff.id, row.staffId))
      .get();
    if (submitter) submitterName = `${submitter.firstName} ${submitter.lastName}`;
  }

  const sanitizedGrievance = {
    ...row,
    staffId: row.isAnonymous ? null : row.staffId,
    submitterName,
  };

  return NextResponse.json({ grievance: sanitizedGrievance });
}, "grievances:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  let scopedInstitutionId: string | null = null;
  try {
    scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  } catch {
    scopedInstitutionId = session.institutionId || null;
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = grievanceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const outcome = await withGrievanceLock(id, async () => {
    const existing = await db.select().from(grievances).where(eq(grievances.id, id)).get();
    if (!existing) {
      return { status: 404, error: "Grievance not found" };
    }

    // Authorization & tenant boundary check
    const hasAccess = await canAccessGrievance(
      session.staffId,
      session.role,
      scopedInstitutionId,
      existing.staffId,
      existing.isAnonymous
    );

    if (!hasAccess) {
      return { status: 404, error: "Grievance not found" };
    }

    // Lifecycle guard: cannot update resolved/dismissed grievances unless re-opening
    const { status, response } = parsed.data;
    if (isTerminalGrievanceStatus(existing.status) && status !== "open" && status !== "in_review") {
      return {
        status: 400,
        error: `Cannot modify grievance in terminal state: '${existing.status}'`,
      };
    }

    const now = new Date().toISOString();
    const updateData: Record<string, string | null> = {
      updatedAt: now,
    };
    if (status) updateData.status = status;
    if (response !== undefined) updateData.response = response;
    updateData.respondedById = session.staffId;
    updateData.respondedAt = now;

    // Optimistic concurrency control: only update if status matches existing.status
    const updated = await db
      .update(grievances)
      .set(updateData)
      .where(and(eq(grievances.id, id), eq(grievances.status, existing.status)))
      .returning()
      .get();

    if (!updated) {
      return { status: 409, error: "Grievance was modified by another concurrent request" };
    }

    // Activity Audit Log
    try {
      await db.insert(activityLogs).values({
        staffId: session.staffId,
        action: `grievance_${status || "updated"}`,
        resourceType: "grievance",
        resourceId: id,
        details: JSON.stringify({
          grievanceId: id,
          previousStatus: existing.status,
          newStatus: status || existing.status,
          respondedBy: session.staffId,
        }),
      });
    } catch (err) {
      console.warn("[GrievanceReview] Activity log insert failed:", err);
    }

    const sanitized = {
      ...updated,
      staffId: updated.isAnonymous ? null : updated.staffId,
    };

    return { status: 200, grievance: sanitized };
  });

  if (outcome.error) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json({ grievance: outcome.grievance });
}, "grievances:manage");

export const DELETE = requireAuth(async (_request: Request, session, context) => {
  const { id } = await context!.params;
  const rl = checkRateLimit(`grievance-del:${session.staffId}`, { windowMs: 60_000, max: 20 });
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  return await withGrievanceLock(id, async () => {
    const existing = await db.select().from(grievances).where(eq(grievances.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
    }

    // Authorization: owner (non-anonymous) or super_admin
    const isOwner = !existing.isAnonymous && existing.staffId === session.staffId;
    const isSuperAdmin = session.role === "super_admin";

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized to delete this grievance" }, { status: 403 });
    }

    // Lifecycle guard: cannot delete resolved or dismissed grievances
    if (isTerminalGrievanceStatus(existing.status)) {
      return NextResponse.json(
        { error: `Cannot delete a grievance in '${existing.status}' status` },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(grievances)
      .where(and(eq(grievances.id, id), inArray(grievances.status, ["open", "in_review"])))
      .returning()
      .get();

    if (!deleted) {
      return NextResponse.json({ error: "Grievance was modified by another concurrent request" }, { status: 409 });
    }

    try {
      await db.insert(activityLogs).values({
        staffId: session.staffId,
        action: "grievance_withdrawn",
        resourceType: "grievance",
        resourceId: id,
        details: JSON.stringify({
          grievanceId: id,
          deletedStatus: existing.status,
          deletedBy: session.staffId,
        }),
      });
    } catch (err) {
      console.warn("[GrievanceDelete] Activity log failed:", err);
    }

    return NextResponse.json({ success: true, status: "deleted" });
  });
}, "grievances:create");
