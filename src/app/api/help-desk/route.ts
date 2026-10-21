import { NextResponse } from "next/server";
import { db } from "@/db";
import { helpDeskTickets, staff, activityLogs } from "@/db/schema";
import { requireAuth, resolveRequestInstitution, resolveInstitutionContext } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { helpDeskTicketCreateSchema } from "@/lib/validation/schemas";
import { eq, and, desc, or } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(`helpdesk-get:${session.staffId}`, { windowMs: 60_000, max: 120 });
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const requestedInst = url.searchParams.get("institutionId");
  const scopedInstitutionId = await resolveRequestInstitution(session, requestedInst);
  const conditions = [];

  if (scopedInstitutionId && scopedInstitutionId !== "global") {
    conditions.push(eq(helpDeskTickets.institutionId, scopedInstitutionId));
  }

  const allowedStatuses = ["open", "in_progress", "resolved", "closed"] as const;
  const statusParam = url.searchParams.get("status");
  if (statusParam && allowedStatuses.includes(statusParam as (typeof allowedStatuses)[number])) {
    conditions.push(eq(helpDeskTickets.status, statusParam));
  }

  const allowedCategories = ["it", "facilities", "academic", "hr", "finance", "general", "hardware", "software"] as const;
  const categoryParam = url.searchParams.get("category");
  if (categoryParam && allowedCategories.includes(categoryParam as (typeof allowedCategories)[number])) {
    conditions.push(eq(helpDeskTickets.category, categoryParam));
  }

  const allowedPriorities = ["low", "medium", "high", "critical"] as const;
  const priorityParam = url.searchParams.get("priority");
  if (priorityParam && allowedPriorities.includes(priorityParam as (typeof allowedPriorities)[number])) {
    conditions.push(eq(helpDeskTickets.priority, priorityParam));
  }

  const isManagerRole = ["super_admin", "admin", "principal", "hod"].includes(session.role);
  if (!isManagerRole) {
    // Non-managers only see tickets they submitted or are assigned to
    conditions.push(
      or(
        eq(helpDeskTickets.submittedById, session.staffId),
        eq(helpDeskTickets.assignedToId, session.staffId)
      )
    );
  }

  const all = await db
    .select({
      id: helpDeskTickets.id,
      title: helpDeskTickets.title,
      subject: helpDeskTickets.title,
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(helpDeskTickets.createdAt))
    .all();

  return NextResponse.json({ tickets: all });
}, "helpdesk:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(`helpdesk-create:${session.staffId}`, { windowMs: 60_000, max: 20 });
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = helpDeskTicketCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const title = parsed.data.title || parsed.data.subject || "Untitled";
  const { description, category, priority, assignedToId } = parsed.data;

  // Resolve concrete institution context so tickets are correctly anchored
  const institutionId = await resolveInstitutionContext(session, parsed.data.institutionId || null);

  const ticket = await db
    .insert(helpDeskTickets)
    .values({
      id: crypto.randomUUID(),
      title,
      description,
      category: category || "it",
      priority: priority || "medium",
      submittedById: session.staffId,
      assignedToId: assignedToId || null,
      status: "open",
      institutionId: institutionId || null,
    })
    .returning()
    .get();

  try {
    await db.insert(activityLogs).values({
      staffId: session.staffId,
      action: "helpdesk_ticket_created",
      resourceType: "helpdesk_ticket",
      resourceId: ticket.id,
      details: JSON.stringify({
        ticketId: ticket.id,
        title,
        category: ticket.category,
        priority: ticket.priority,
        institutionId,
      }),
    });
  } catch (err) {
    console.warn("[HelpdeskCreate] Activity log failed:", err);
  }

  return NextResponse.json({ ticket }, { status: 201 });
}, "helpdesk:create");
