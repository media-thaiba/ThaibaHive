import { NextResponse } from "next/server";
import { db } from "@/db";
import { helpDeskTickets, helpDeskComments, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  const ticket = await db
    .select({
      id: helpDeskTickets.id,
      subject: helpDeskTickets.title,
      description: helpDeskTickets.description,
      category: helpDeskTickets.category,
      priority: helpDeskTickets.priority,
      status: helpDeskTickets.status,
      createdByName: staff.firstName,
      createdByLastName: staff.lastName,
      createdAt: helpDeskTickets.createdAt,
      updatedAt: helpDeskTickets.updatedAt,
    })
    .from(helpDeskTickets)
    .leftJoin(staff, eq(helpDeskTickets.submittedById, staff.id))
    .where(eq(helpDeskTickets.id, id))
    .get();

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
  const body = await request.json();
  const { status, assignedToId } = body;
  const updateData: Record<string, string> = {};
  if (status) updateData.status = status;
  if (assignedToId) updateData.assignedToId = assignedToId;
  await db.update(helpDeskTickets).set(updateData).where(eq(helpDeskTickets.id, id)).run();
  return NextResponse.json({ success: true });
}, "helpdesk:manage");