import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitors, staff, activityLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { visitorUpdateSchema } from "@/lib/validation/schemas";
import { withVisitorLock, recordGateLog } from "@/lib/visitors/ledger";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  let id = params.id;
  if (!id) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && last !== "visitors") {
      id = last;
    }
  }
  if (!id) return NextResponse.json({ error: "Visitor ID is required" }, { status: 400 });

  const institutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(visitors.id, id), eq(visitors.institutionId, institutionId))
    : eq(visitors.id, id);

  const visitor = await db
    .select({
      id: visitors.id,
      name: visitors.name,
      contact: visitors.contact,
      idType: visitors.idType,
      idNumber: visitors.idNumber,
      hostStaffId: visitors.hostStaffId,
      hostStaffName: staff.firstName,
      hostStaffLastName: staff.lastName,
      purpose: visitors.purpose,
      checkIn: visitors.checkIn,
      checkOut: visitors.checkOut,
      status: visitors.status,
      notes: visitors.notes,
      institutionId: visitors.institutionId,
      createdAt: visitors.createdAt,
    })
    .from(visitors)
    .leftJoin(staff, eq(visitors.hostStaffId, staff.id))
    .where(whereClause)
    .get();

  if (!visitor) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });

  return NextResponse.json({ visitor });
}, "visitors:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  let id = params.id;
  if (!id) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && last !== "visitors") {
      id = last;
    }
  }
  if (!id) return NextResponse.json({ error: "Visitor ID is required" }, { status: 400 });

  const rl = checkRateLimit(`visitor-patch:${session.staffId}`, { windowMs: 60_000, max: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  return await withVisitorLock(id, async () => {
    const institutionId = await resolveScopedInstitutionId(session.institutionId);
    const whereClause = institutionId && institutionId !== "global"
      ? and(eq(visitors.id, id), eq(visitors.institutionId, institutionId))
      : eq(visitors.id, id);

    const existing = await db.select().from(visitors).where(whereClause).get();
    if (!existing) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const parsed = visitorUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update parameters" },
        { status: 400 }
      );
    }

    const { checkOut, status, notes } = parsed.data;

    // Checked-out is terminal for lifecycle transitions: reject status updates (including
    // duplicate check-outs racing each other) so check-in/check-out metrics cannot drift
    // from stored timestamps. Timestamp/note corrections without a status stay allowed.
    if (existing.status === "checked_out" && status !== undefined) {
      return NextResponse.json(
        { error: "Visitor has already checked out" },
        { status: 409 }
      );
    }

    const updateData: Record<string, string | null> = {};
    if (checkOut !== undefined) updateData.checkOut = checkOut;
    if (status) {
      updateData.status = status;
      if (status === "checked_out" && !checkOut && !existing.checkOut) {
        updateData.checkOut = new Date().toISOString();
      }
    }
    if (notes !== undefined) updateData.notes = notes;

    // Optimistic concurrency control: ensure existing.status hasn't transitioned concurrently
    const updated = await db
      .update(visitors)
      .set(updateData)
      .where(and(whereClause, eq(visitors.status, existing.status)))
      .returning()
      .get();

    if (!updated) {
      return NextResponse.json(
        { error: "Visitor record was modified by another concurrent request" },
        { status: 409 }
      );
    }

    // Record gate log if checking out
    if (status === "checked_out" && existing.status !== "checked_out") {
      await recordGateLog({
        institutionId: existing.institutionId,
        visitorName: existing.name,
        actionType: "check_out",
        gatekeeperId: session.staffId,
        notes: notes || undefined,
      });
    }

    // Record activity audit log
    try {
      await db.insert(activityLogs).values({
        staffId: session.staffId,
        action: `visitor_${status || "updated"}`,
        resourceType: "visitor",
        resourceId: id,
        details: JSON.stringify({
          visitorId: id,
          previousStatus: existing.status,
          newStatus: status || existing.status,
          updatedBy: session.staffId,
        }),
      });
    } catch (err) {
      console.warn("[VisitorReview] Activity log failed:", err);
    }

    return NextResponse.json({ visitor: updated });
  });
}, "visitors:update");

export const DELETE = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  let id = params.id;
  if (!id) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && last !== "visitors") {
      id = last;
    }
  }
  if (!id) return NextResponse.json({ error: "Visitor ID is required" }, { status: 400 });

  const rl = checkRateLimit(`visitor-del:${session.staffId}`, { windowMs: 60_000, max: 20 });
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  return await withVisitorLock(id, async () => {
    const institutionId = await resolveScopedInstitutionId(session.institutionId);
    const whereClause = institutionId && institutionId !== "global"
      ? and(eq(visitors.id, id), eq(visitors.institutionId, institutionId))
      : eq(visitors.id, id);

    const existing = await db.select().from(visitors).where(whereClause).get();
    if (!existing) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });

    // Physical Security Evacuation & Audit Guard:
    // Deleting active checked-in visitors creates campus security blindspots.
    if (existing.status === "checked_in") {
      return NextResponse.json(
        { error: "Cannot delete a visitor with active 'checked_in' status. Check out the visitor first." },
        { status: 400 }
      );
    }

    await db.delete(visitors).where(whereClause).run();

    try {
      await db.insert(activityLogs).values({
        staffId: session.staffId,
        action: "visitor_record_deleted",
        resourceType: "visitor",
        resourceId: id,
        details: JSON.stringify({
          visitorId: id,
          deletedStatus: existing.status,
          visitorName: existing.name,
          deletedBy: session.staffId,
        }),
      });
    } catch (err) {
      console.warn("[VisitorDelete] Activity log failed:", err);
    }

    return NextResponse.json({ success: true, status: "deleted" });
  });
}, "visitors:manage");
