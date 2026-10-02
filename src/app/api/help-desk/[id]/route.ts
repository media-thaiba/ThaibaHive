import { NextResponse } from "next/server";
import { db } from "@/db";
import { helpDeskTickets, helpDeskComments, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const isAdminRole = ["super_admin", "admin"].includes(session.role);
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(helpDeskTickets.id, id), eq(helpDeskTickets.institutionId, institutionId))
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

  if (!isAdminRole && ticket.submittedById !== session.staffId && ticket.assignedToId !== session.staffId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comments = await db
    .select({
      id: helpDeskComments.id,
      content: helpDeskComments.content,
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
  const isAdminRole = ["super_admin", "admin"].includes(session.role);
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(helpDeskTickets.id, id), eq(helpDeskTickets.institutionId, institutionId))
    : eq(helpDeskTickets.id, id);

  const existing = await db.select().from(helpDeskTickets).where(whereClause).get();
  if (!existing) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (!isAdminRole && existing.submittedById !== session.staffId && existing.assignedToId !== session.staffId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { status, assignedToId } = body;
  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (status) updateData.status = status;
  if (assignedToId) updateData.assignedToId = assignedToId;
  await db.update(helpDeskTickets).set(updateData).where(whereClause).run();
  return NextResponse.json({ success: true });
}, "helpdesk:manage");