import { NextResponse } from "next/server";
import { db } from "@/db";
import { helpDeskTickets, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { helpDeskTicketCreateSchema } from "@/lib/validation/schemas";
import { eq, and, desc } from "drizzle-orm";

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export const GET = requireAuth(async (request: Request, session) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const conditions = [];
  const isAdminRole = ["super_admin", "admin"].includes(session.role);
  if (!isAdminRole) {
    conditions.push(eq(helpDeskTickets.submittedById, session.staffId));
  }

  const all = await db
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
    })
    .from(helpDeskTickets)
    .leftJoin(staff, eq(helpDeskTickets.submittedById, staff.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(helpDeskTickets.createdAt))
    .all();

  return NextResponse.json({ tickets: all });
}, "helpdesk:read");

export const POST = requireAuth(async (request: Request, session) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  
  const body = await request.json();
  const parsed = helpDeskTicketCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { title, description, category, priority } = parsed.data;

  const ticket = await db.insert(helpDeskTickets).values({
    id: crypto.randomUUID(),
    title,
    description,
    category: category || "it",
    priority: priority || "medium",
    submittedById: session.staffId,
    status: "open",
  }).returning().get();

  return NextResponse.json({ ticket }, { status: 201 });
}, "helpdesk:create");