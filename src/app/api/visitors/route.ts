import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitors, staff } from "@/db/schema";
import { requireAuth, resolveRequestInstitution, resolveInstitutionContext } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { visitorCreateSchema } from "@/lib/validation/schemas";
import { validateHostStaff } from "@/lib/visitors/host-validation";
import { recordGateLog } from "@/lib/visitors/ledger";
import { eq, and, desc, sql } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const conditions = [];

  const institutionId = await resolveRequestInstitution(session, searchParams.get("institutionId"));
  if (institutionId && institutionId !== "global") {
    conditions.push(eq(visitors.institutionId, institutionId));
  }

  if (status) conditions.push(eq(visitors.status, status));
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD" }, { status: 400 });
    }
    conditions.push(sql`date(${visitors.checkIn}) = ${date}`);
  }

  const result = await db
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(visitors.checkIn))
    .all();

  return NextResponse.json({ visitors: result });
}, "visitors:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(`visitor-create:${session.staffId}`, { windowMs: 60_000, max: 20 });
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = visitorCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid visitor parameters", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { name, contact, idType, idNumber, hostStaffId, purpose, notes } = parsed.data;
  // Concrete (never "global") tenant context so the visitor row always belongs
  // to a real institution — admins fall back to their first membership.
  const institutionId = await resolveInstitutionContext(session, null);
  if (!institutionId) {
    return NextResponse.json(
      { error: "Unable to resolve institution scope for visitor registration" },
      { status: 400 }
    );
  }

  // Host must reference an active staff member inside the tenant scope
  if (hostStaffId) {
    const hostCheck = await validateHostStaff(hostStaffId, institutionId);
    if (!hostCheck.ok) {
      return NextResponse.json({ error: hostCheck.error }, { status: hostCheck.status });
    }
  }

  const checkInTime = new Date().toISOString();
  const visitor = await db
    .insert(visitors)
    .values({
      id: crypto.randomUUID(),
      name,
      contact: contact || null,
      idType: idType || null,
      idNumber: idNumber || null,
      hostStaffId: hostStaffId || null,
      purpose,
      notes: notes || null,
      institutionId,
      checkIn: checkInTime,
      status: "checked_in",
    })
    .returning()
    .get();

  // Record physical gate log entry
  await recordGateLog({
    institutionId,
    visitorName: name,
    actionType: "check_in",
    gatekeeperId: session.staffId,
    notes: `Walk-in registration: ${purpose}`,
  });

  return NextResponse.json({ visitor }, { status: 201 });
}, "visitors:create");
