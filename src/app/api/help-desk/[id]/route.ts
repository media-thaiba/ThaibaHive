import { NextResponse } from "next/server";
import { db } from "@/db";
import { helpDeskTickets, helpDeskComments, staff, activityLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { helpDeskTicketUpdateSchema } from "@/lib/validation/schemas";
import { withTicketLock, canAccessTicket, canManageTicket, isTerminalTicketStatus } from "@/lib/help-desk/ledger";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);

  const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
    ? and(eq(helpDeskTickets.id, id), eq(helpDeskTickets.institutionId, scopedInstitutionId))
    : eq(helpDeskTickets.id, id);

  const ticket = await db
    .select({
      id: helpDeskTickets.id,
      title: helpDeskTickets.title,
      description: helpDeskTickets.description,
      category: helpDeskTickets.category,
      priority: helpDeskTickets.priority,
      status: helpDeskTickets.status,
      submittedById: helpDeskTickets.submittedById,
      assignedToId: helpDeskTickets.assignedToId,
      institutionId: helpDeskTickets.institutionId,
      resolvedAt: helpDeskTickets.resolvedAt,
      createdByName: staff.firstName,
      createdByLastName: staff.lastName,
      createdAt: helpDeskTickets.createdAt,
      updatedAt: helpDeskTickets.updatedAt,
    })
    .from(helpDeskTickets)
    .leftJoin(staff, eq(helpDeskTickets.submittedById, staff.id))
    .where(whereClause)
    .get();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const hasAccess = canAccessTicket({
    viewerStaffId: session.staffId,
    viewerRole: session.role,
    viewerInstitutionId: scopedInstitutionId,
    ticketInstitutionId: ticket.institutionId,
    submittedById: ticket.submittedById,
    assignedToId: ticket.assignedToId,
  });

  if (!hasAccess) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const comments = await db
    .select({
      id: helpDeskComments.id,
      content: helpDeskComments.content,
      staffId: helpDeskComments.staffId,
      authorName: staff.firstName,
      authorLastName: staff.lastName,
      createdAt: helpDeskComments.createdAt,
    })
    .from(helpDeskComments)
    .leftJoin(staff, eq(helpDeskComments.staffId, staff.id))
    .where(eq(helpDeskComments.ticketId, id))
    .orderBy(helpDeskComments.createdAt)
    .all();

  return NextResponse.json({ ticket, comments });
}, "helpdesk:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;

  const rl = checkRateLimit(`helpdesk-patch:${session.staffId}`, { windowMs: 60_000, max: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  return await withTicketLock(id, async () => {
    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
    const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
      ? and(eq(helpDeskTickets.id, id), eq(helpDeskTickets.institutionId, scopedInstitutionId))
      : eq(helpDeskTickets.id, id);

    const existing = await db.select().from(helpDeskTickets).where(whereClause).get();
    if (!existing) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const hasManageAccess = canManageTicket({
      viewerStaffId: session.staffId,
      viewerRole: session.role,
      viewerInstitutionId: scopedInstitutionId,
      ticketInstitutionId: existing.institutionId,
      submittedById: existing.submittedById,
      assignedToId: existing.assignedToId,
    });

    if (!hasManageAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Safely parse JSON body (fixes live unhandled JSON parsing crash)
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = helpDeskTicketUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update parameters" },
        { status: 400 }
      );
    }

    const { status, assignedToId, title, description, category, priority } = parsed.data;

    // Terminal state immutability: closed tickets cannot be updated unless being reopened
    if (isTerminalTicketStatus(existing.status) && status !== "open" && status !== "in_progress") {
      return NextResponse.json(
        { error: `Cannot modify ticket in terminal state '${existing.status}'. Reopen the ticket first.` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (priority) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (status) {
      updateData.status = status;
      if (status === "resolved") {
        updateData.resolvedAt = now;
      }
    }

    // Optimistic concurrency control: ensure existing.status has not mutated
    const updated = await db
      .update(helpDeskTickets)
      .set(updateData)
      .where(and(whereClause, eq(helpDeskTickets.status, existing.status)))
      .returning()
      .get();

    if (!updated) {
      return NextResponse.json(
        { error: "Ticket was modified by another concurrent request" },
        { status: 409 }
      );
    }

    try {
      await db.insert(activityLogs).values({
        staffId: session.staffId,
        action: `helpdesk_ticket_${status || "updated"}`,
        resourceType: "helpdesk_ticket",
        resourceId: id,
        details: JSON.stringify({
          ticketId: id,
          previousStatus: existing.status,
          newStatus: status || existing.status,
          updatedBy: session.staffId,
        }),
      });
    } catch (err) {
      console.warn("[HelpdeskReview] Activity log failed:", err);
    }

    return NextResponse.json({ ticket: updated, success: true });
  });
}, "helpdesk:manage");

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;

  const rl = checkRateLimit(`helpdesk-del:${session.staffId}`, { windowMs: 60_000, max: 20 });
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  return await withTicketLock(id, async () => {
    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
    const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
      ? and(eq(helpDeskTickets.id, id), eq(helpDeskTickets.institutionId, scopedInstitutionId))
      : eq(helpDeskTickets.id, id);

    const existing = await db.select().from(helpDeskTickets).where(whereClause).get();
    if (!existing) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const isOwner = existing.submittedById === session.staffId;
    const isManager = ["super_admin", "admin", "principal", "hod"].includes(session.role);

    if (!isOwner && !isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Submitter can only withdraw while status is open
    if (isOwner && !isManager && existing.status !== "open") {
      return NextResponse.json(
        { error: `Cannot withdraw a ticket in '${existing.status}' status. Contact helpdesk support.` },
        { status: 400 }
      );
    }

    // Delete child comments first to maintain referential integrity
    await db.delete(helpDeskComments).where(eq(helpDeskComments.ticketId, id)).run();

    await db.delete(helpDeskTickets).where(whereClause).run();

    try {
      await db.insert(activityLogs).values({
        staffId: session.staffId,
        action: "helpdesk_ticket_deleted",
        resourceType: "helpdesk_ticket",
        resourceId: id,
        details: JSON.stringify({
          ticketId: id,
          deletedStatus: existing.status,
          title: existing.title,
          deletedBy: session.staffId,
        }),
      });
    } catch (err) {
      console.warn("[HelpdeskDelete] Activity log failed:", err);
    }

    return NextResponse.json({ success: true, status: "deleted" });
  });
}, "helpdesk:create");
