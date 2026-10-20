import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookingResources } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { bookingResourceCreateSchema } from "@/lib/validation/schemas";
import { desc, eq } from "drizzle-orm";

export const GET = requireAuth(async (_request: Request, session) => {
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
    ? eq(bookingResources.institutionId, scopedInstitutionId)
    : undefined;

  const query = db.select().from(bookingResources);
  const resources = whereClause
    ? await query.where(whereClause).orderBy(desc(bookingResources.createdAt)).all()
    : await query.orderBy(desc(bookingResources.createdAt)).all();

  return NextResponse.json({ resources });
}, "bookings:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bookingResourceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid resource payload" }, { status: 400 });
  }

  const { name, type, capacity, location, description, institutionId: requestedInstId } = parsed.data;

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  let effectiveInstitutionId: string | null = null;
  if (scopedInstitutionId && scopedInstitutionId !== "global") {
    effectiveInstitutionId = scopedInstitutionId;
  } else if (requestedInstId && requestedInstId !== "global") {
    effectiveInstitutionId = requestedInstId;
  } else if (session.institutionId && session.institutionId !== "global") {
    effectiveInstitutionId = session.institutionId;
  }

  const resource = await db.insert(bookingResources).values({
    id: crypto.randomUUID(),
    institutionId: effectiveInstitutionId,
    name,
    type,
    capacity: capacity ?? null,
    location: location ?? null,
    description: description ?? null,
    isActive: true,
  }).returning().get();

  return NextResponse.json({ resource }, { status: 201 });
}, "bookings:manage");