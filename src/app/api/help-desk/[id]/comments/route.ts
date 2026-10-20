import { NextResponse } from "next/server";
import { db } from "@/db";
import { helpDeskComments, helpDeskTickets, activityLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { helpDeskCommentCreateSchema } from "@/lib/validation/schemas";
import { withTicketLock, canAccessTicket, isTerminalTicketStatus } from "@/lib/help-desk/ledger";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request, session, context) => {
  const { id } = await context!.params;

  const rl = checkRateLimit(`helpdesk-cmt:${session.staffId}`, { windowMs: 60_000, max: 40 });
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = helpDeskCommentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Content required" },
      { status: 400 }
    );
  }

  return await withTicketLock(id, async () => {
    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
    const whereClause =
      scopedInstitutionId && scopedInstitutionId !== "global"
        ? and(eq(helpDeskTickets.id, id), eq(helpDeskTickets.institutionId, scopedInstitutionId))
        : eq(helpDeskTickets.id, id);

    const ticket = await db.select().from(helpDeskTickets).where(whereClause).get();
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Block adding comments to closed tickets
    if (isTerminalTicketStatus(ticket.status)) {
      return NextResponse.json(
        { error: `Cannot comment on a ticket in terminal state '${ticket.status}'. Reopen the ticket first.` },
        { status: 400 }
      );
    }

    const comment = await db
      .insert(helpDeskComments)
      .values({
        id: crypto.randomUUID(),
        ticketId: id,
        staffId: session.staffId,
        content: parsed.data.content,
      })
      .returning()
      .get();

    try {
      await db.insert(activityLogs).values({
        staffId: session.staffId,
        action: "helpdesk_comment_added",
        resourceType: "helpdesk_comment",
        resourceId: comment.id,
        details: JSON.stringify({
          ticketId: id,
          commentId: comment.id,
          authorId: session.staffId,
        }),
      });
    } catch (err) {
      console.warn("[HelpdeskComment] Activity log failed:", err);
    }

    return NextResponse.json({ comment }, { status: 201 });
  });
}, "helpdesk:read");
