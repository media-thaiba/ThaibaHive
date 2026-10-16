import { NextResponse } from "next/server";
import { db } from "@/db";
import { helpDeskComments, helpDeskTickets } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const commentCreateSchema = z.object({
  content: z.string().trim().min(1, "Content required").max(5000, "Comment is too long"),
});

export const POST = requireAuth(async (request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json().catch(() => ({}));
  const parsed = commentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Content required" },
      { status: 400 }
    );
  }

  const isAdminRole = ["super_admin", "admin"].includes(session.role);
  const institutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause =
    institutionId && institutionId !== "global"
      ? and(eq(helpDeskTickets.id, id), eq(helpDeskTickets.institutionId, institutionId))
      : eq(helpDeskTickets.id, id);

  const ticket = await db.select().from(helpDeskTickets).where(whereClause).get();
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (
    !isAdminRole &&
    ticket.submittedById !== session.staffId &&
    ticket.assignedToId !== session.staffId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  return NextResponse.json({ comment }, { status: 201 });
}, "helpdesk:read");